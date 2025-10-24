"""
CitadelX AI Moderator NFT Contract
Creates and manages NFTs representing AI moderators
Based on Algorand ASA standards
"""

from algopy import *
from algopy.arc4 import abimethod, Struct, UInt64 as ARC4UInt64, Address, Bool, String as ARC4String


class ModeratorNFT(Struct):
    """AI Moderator NFT metadata"""
    asset_id: ARC4UInt64
    name: ARC4String
    description: ARC4String
    category: ARC4String
    creator_dao: ARC4UInt64  # DAO app ID that created this moderator
    creator_address: Address
    ipfs_hash: ARC4String    # IPFS hash for training data
    created_at: ARC4UInt64
    is_active: Bool
    usage_count: ARC4UInt64
    revenue_generated: ARC4UInt64


class ModeratorLicense(Struct):
    """License for using an AI moderator"""
    nft_id: ARC4UInt64
    licensee: Address
    license_type: ARC4String  # "subscription", "purchase", "pay_per_use"
    start_date: ARC4UInt64
    end_date: ARC4UInt64      # 0 for permanent licenses
    usage_limit: ARC4UInt64   # 0 for unlimited
    usage_count: ARC4UInt64
    amount_paid: ARC4UInt64
    is_active: Bool


class CitadelModeratorNFT(ARC4Contract):
    """
    AI Moderator NFT Contract
    
    Features:
    - NFT creation for AI moderators
    - Licensing and usage tracking
    - Revenue management
    - Marketplace integration
    """

    def __init__(self) -> None:
        # NFT tracking
        self.nft_count = GlobalState(UInt64, key="nft_count")
        self.license_count = GlobalState(UInt64, key="license_count")
        self.total_revenue = GlobalState(UInt64, key="total_revenue")
        
        # Associated contracts
        self.dao_contract = GlobalState(UInt64, key="dao_app_id")
        self.treasury_contract = GlobalState(UInt64, key="treasury_app_id")
        
        # Storage
        self.moderator_nfts = BoxMap(UInt64, ModeratorNFT, key_prefix=b"nft_")
        self.asset_to_nft = BoxMap(UInt64, UInt64, key_prefix=b"asset_")  # asset_id -> nft_id
        self.licenses = BoxMap(UInt64, ModeratorLicense, key_prefix=b"license_")
        self.user_licenses = BoxMap(Bytes, UInt64, key_prefix=b"user_lic_")  # user+nft -> license_id
        
        # Initialization flag
        self.is_initialized = GlobalState(Bool, key="init")

    @abimethod()
    def initialize_nft_contract(
        self,
        dao_app_id: UInt64,
        treasury_app_id: UInt64,
    ) -> String:
        """
        Initialize NFT contract
        
        Args:
            dao_app_id: Associated DAO contract app ID
            treasury_app_id: Associated treasury contract app ID
            
        Returns:
            Success message
        """
        assert not self.is_initialized.value, "NFT contract already initialized"
        
        # Validate parameters
        assert dao_app_id > 0, "Invalid DAO app ID"
        assert treasury_app_id > 0, "Invalid treasury app ID"
        
        # Set contract references
        self.dao_contract.value = dao_app_id
        self.treasury_contract.value = treasury_app_id
        
        # Initialize counters
        self.nft_count.value = UInt64(0)
        self.license_count.value = UInt64(0)
        self.total_revenue.value = UInt64(0)
        self.is_initialized.value = True
        
        return String("NFT contract initialized")

    @abimethod()
    def create_moderator_nft(
        self,
        name: String,
        description: String,
        category: String,
        ipfs_hash: String,
        dao_app_id: UInt64,
    ) -> UInt64:
        """
        Create a new AI Moderator NFT
        
        Args:
            name: Moderator name
            description: Moderator description
            category: Moderator category
            ipfs_hash: IPFS hash for training data
            dao_app_id: Creating DAO's app ID
            
        Returns:
            NFT ID
        """
        assert self.is_initialized.value, "NFT contract not initialized"
        
        # Validate inputs
        assert len(name.bytes) > 0, "Name cannot be empty"
        assert len(description.bytes) > 0, "Description cannot be empty"
        assert len(category.bytes) > 0, "Category cannot be empty"
        assert len(ipfs_hash.bytes) > 0, "IPFS hash cannot be empty"
        
        # TODO: Verify caller is authorized by the DAO
        
        # Create the ASA (NFT)
        asset_id = self._create_asa(name, description, ipfs_hash)
        
        # Generate NFT ID
        nft_id = self.nft_count.value + UInt64(1)
        self.nft_count.value = nft_id
        
        # Create NFT record
        moderator_nft = ModeratorNFT(
            asset_id=ARC4UInt64(asset_id),
            name=ARC4String.from_bytes(name.bytes),
            description=ARC4String.from_bytes(description.bytes),
            category=ARC4String.from_bytes(category.bytes),
            creator_dao=ARC4UInt64(dao_app_id),
            creator_address=Address(Txn.sender),
            ipfs_hash=ARC4String.from_bytes(ipfs_hash.bytes),
            created_at=ARC4UInt64(Global.latest_timestamp),
            is_active=Bool(True),
            usage_count=ARC4UInt64(0),
            revenue_generated=ARC4UInt64(0)
        )
        
        # Store NFT data
        self.moderator_nfts[nft_id] = moderator_nft
        self.asset_to_nft[asset_id] = nft_id
        
        return nft_id

    @abimethod()
    def purchase_license(
        self,
        nft_id: UInt64,
        license_type: String,
        duration_days: UInt64,
        usage_limit: UInt64,
        payment: gtxn.PaymentTransaction,
    ) -> UInt64:
        """
        Purchase a license to use an AI moderator
        
        Args:
            nft_id: NFT ID to license
            license_type: "subscription", "purchase", or "pay_per_use"
            duration_days: License duration (0 for permanent)
            usage_limit: Usage limit (0 for unlimited)
            payment: License payment
            
        Returns:
            License ID
        """
        assert self.is_initialized.value, "NFT contract not initialized"
        
        # Get NFT info
        nft, exists = self.moderator_nfts.maybe(nft_id)
        assert exists, "NFT not found"
        assert nft.is_active, "NFT is not active"
        
        # Validate payment
        assert payment.receiver == Global.current_application_address, "Payment must be to NFT contract"
        assert payment.sender == Txn.sender, "Payment sender must match caller"
        assert payment.amount > 0, "Payment amount must be positive"
        
        # Check if user already has active license
        user_license_key = op.concat(Txn.sender.bytes, op.itob(nft_id))
        existing_license_id, has_license = self.user_licenses.maybe(user_license_key)
        
        if has_license:
            existing_license, _ = self.licenses.maybe(existing_license_id)
            assert not existing_license.is_active, "User already has active license"
        
        # Calculate license dates
        current_time = Global.latest_timestamp
        end_date = UInt64(0)  # Permanent by default
        
        if duration_days > 0:
            end_date = current_time + (duration_days * 86400)  # Convert days to seconds
        
        # Generate license ID
        license_id = self.license_count.value + UInt64(1)
        self.license_count.value = license_id
        
        # Create license
        license = ModeratorLicense(
            nft_id=ARC4UInt64(nft_id),
            licensee=Address(Txn.sender),
            license_type=ARC4String.from_bytes(license_type.bytes),
            start_date=ARC4UInt64(current_time),
            end_date=ARC4UInt64(end_date),
            usage_limit=ARC4UInt64(usage_limit),
            usage_count=ARC4UInt64(0),
            amount_paid=ARC4UInt64(payment.amount),
            is_active=Bool(True)
        )
        
        # Store license
        self.licenses[license_id] = license
        self.user_licenses[user_license_key] = license_id
        
        # Update revenue tracking
        self.total_revenue.value += payment.amount
        nft.revenue_generated = ARC4UInt64(nft.revenue_generated.native + payment.amount)
        self.moderator_nfts[nft_id] = nft
        
        # TODO: Forward payment to treasury contract
        
        return license_id

    @abimethod()
    def use_moderator(self, nft_id: UInt64) -> String:
        """
        Use an AI moderator (requires valid license)
        
        Args:
            nft_id: NFT ID to use
            
        Returns:
            Usage confirmation
        """
        assert self.is_initialized.value, "NFT contract not initialized"
        
        # Get NFT info
        nft, exists = self.moderator_nfts.maybe(nft_id)
        assert exists, "NFT not found"
        assert nft.is_active, "NFT is not active"
        
        # Check user license
        user_license_key = op.concat(Txn.sender.bytes, op.itob(nft_id))
        license_id, has_license = self.user_licenses.maybe(user_license_key)
        assert has_license, "No license found for user"
        
        # Get license details
        license, _ = self.licenses.maybe(license_id)
        assert license.is_active, "License is not active"
        
        # Check license validity
        current_time = Global.latest_timestamp
        if license.end_date.native > 0:
            assert current_time <= license.end_date.native, "License expired"
        
        if license.usage_limit.native > 0:
            assert license.usage_count.native < license.usage_limit.native, "Usage limit exceeded"
        
        # Update usage counts
        license.usage_count = ARC4UInt64(license.usage_count.native + UInt64(1))
        self.licenses[license_id] = license
        
        nft.usage_count = ARC4UInt64(nft.usage_count.native + UInt64(1))
        self.moderator_nfts[nft_id] = nft
        
        return String("Moderator usage recorded")

    @subroutine
    def _create_asa(self, name: String, description: String, ipfs_hash: String) -> UInt64:
        """
        Create an Algorand Standard Asset (NFT)
        
        Args:
            name: Asset name
            description: Asset description
            ipfs_hash: IPFS hash for metadata
            
        Returns:
            Asset ID
        """
        # Create NFT with inner transaction
        itxn.AssetConfig(
            total=UInt64(1),  # NFT - only 1 unit
            decimals=UInt64(0),  # NFT - no decimals
            default_frozen=False,
            asset_name=name.bytes,
            unit_name=Bytes(b"CITMOD"),
            url=op.concat(Bytes(b"ipfs://"), ipfs_hash.bytes),
            metadata_hash=op.sha256(description.bytes),
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
        ).submit()
        
        # Return the created asset ID
        return Global.latest_timestamp  # Placeholder - in real implementation, get actual asset ID

    @abimethod(readonly=True)
    def get_nft_info(self, nft_id: UInt64) -> ModeratorNFT:
        """Get NFT information"""
        assert self.is_initialized.value, "NFT contract not initialized"
        
        nft, exists = self.moderator_nfts.maybe(nft_id)
        assert exists, "NFT not found"
        
        return nft

    @abimethod(readonly=True)
    def get_license_info(self, license_id: UInt64) -> ModeratorLicense:
        """Get license information"""
        assert self.is_initialized.value, "NFT contract not initialized"
        
        license, exists = self.licenses.maybe(license_id)
        assert exists, "License not found"
        
        return license

    @abimethod(readonly=True)
    def get_user_license(self, user: Address, nft_id: UInt64) -> UInt64:
        """Get user's license ID for an NFT"""
        assert self.is_initialized.value, "NFT contract not initialized"
        
        user_license_key = op.concat(user.bytes, op.itob(nft_id))
        license_id, exists = self.user_licenses.maybe(user_license_key)
        assert exists, "No license found"
        
        return license_id

    @abimethod(readonly=True)
    def get_nft_count(self) -> UInt64:
        """Get total number of NFTs created"""
        if not self.is_initialized.value:
            return UInt64(0)
        return self.nft_count.value

    @abimethod(readonly=True)
    def get_total_revenue(self) -> UInt64:
        """Get total revenue generated"""
        if not self.is_initialized.value:
            return UInt64(0)
        return self.total_revenue.value

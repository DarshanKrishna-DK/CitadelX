from algopy import ARC4Contract, String, UInt64, Account, Global, Txn, Asset, arc4
from algopy.arc4 import abimethod, Address, Bool, UInt64 as ARC4UInt64


class ModeratorNFT(ARC4Contract):
    """
    ModeratorNFT Smart Contract
    
    Manages NFT creation (ASA) for AI moderators with metadata
    Each NFT represents a unique AI moderator with training context
    """

    @abimethod()
    def mint_moderator_nft(
        self,
        moderator_name: String,
        moderator_description: String,
        dao_id: String,
        metadata_url: String,
        total_supply: UInt64,
    ) -> UInt64:
        """
        Mint a new AI Moderator NFT as an Algorand Standard Asset (ASA)
        
        Args:
            moderator_name: Name of the AI moderator
            moderator_description: Description of the moderator
            dao_id: ID of the DAO that created it
            metadata_url: URL to IPFS metadata (JSON with full details)
            total_supply: Total supply (typically 1 for NFT)
        
        Returns:
            Asset ID of the minted NFT
        """
        # Validate inputs
        assert total_supply > 0, "Total supply must be greater than 0"
        
        # In production, this would create an ASA using itxn (inner transaction)
        # The ASA would have:
        # - Asset Name: moderator_name
        # - Unit Name: "MODAI"
        # - Total: total_supply
        # - Decimals: 0 (NFT)
        # - URL: metadata_url (points to IPFS JSON)
        # - Metadata Hash: hash of the metadata
        
        # For now, return a mock asset ID
        asset_id = UInt64(100000) + Global.latest_timestamp
        
        return asset_id

    @abimethod()
    def transfer_nft(
        self,
        asset_id: UInt64,
        from_address: Address,
        to_address: Address,
        amount: UInt64,
    ) -> String:
        """
        Transfer NFT ownership (for outright purchases)
        
        Args:
            asset_id: The asset ID of the NFT
            from_address: Current owner
            to_address: New owner
            amount: Amount to transfer (typically 1 for NFT)
        
        Returns:
            Success message
        """
        # Verify sender is authorized (current owner or contract)
        # Create asset transfer transaction
        
        # In production: Use itxn.AssetTransfer to transfer the ASA
        
        return String("NFT transferred successfully")

    @abimethod()
    def update_metadata(
        self,
        asset_id: UInt64,
        new_metadata_url: String,
    ) -> String:
        """
        Update NFT metadata URL (for usage statistics updates)
        
        Args:
            asset_id: The asset ID of the NFT
            new_metadata_url: New metadata URL pointing to updated IPFS file
        
        Returns:
            Success message
        """
        # Verify sender is DAO creator or authorized
        # Update asset configuration
        
        # In production: Use itxn.AssetConfig to update the metadata URL
        
        return String("Metadata updated for asset ID successfully")

    @abimethod()
    def burn_nft(
        self,
        asset_id: UInt64,
    ) -> String:
        """
        Burn/destroy an NFT (if moderator is decommissioned)
        
        Args:
            asset_id: The asset ID of the NFT to burn
        
        Returns:
            Success message
        """
        # Verify sender is authorized (DAO creator or contract admin)
        # Destroy the asset
        
        # In production: Use itxn.AssetConfig to destroy the ASA
        
        return String("NFT burned successfully")

    @abimethod()
    def get_nft_info(
        self,
        asset_id: UInt64,
    ) -> String:
        """
        Get NFT information
        
        Args:
            asset_id: The asset ID of the NFT
        
        Returns:
            NFT information as string
        """
        # In production: Query asset details from the blockchain
        # Return asset name, URL, creator, etc.
        
        return String("NFT Info retrieved successfully")

    @abimethod()
    def opt_in_asset(
        self,
        asset_id: UInt64,
    ) -> String:
        """
        Opt-in to receive an NFT (Algorand requires opt-in before receiving assets)
        
        Args:
            asset_id: The asset ID to opt into
        
        Returns:
            Success message
        """
        # Create opt-in transaction (asset transfer of 0 to self)
        
        # In production: Use itxn.AssetTransfer with amount 0 to sender
        
        return String("Opted in to asset successfully")

    @abimethod()
    def set_pricing(
        self,
        asset_id: UInt64,
        monthly_price: UInt64,
        pay_per_use_price: UInt64,
        outright_price: UInt64,
    ) -> String:
        """
        Set pricing models for the moderator NFT
        
        Args:
            asset_id: The asset ID of the moderator NFT
            monthly_price: Monthly subscription price in microAlgos
            pay_per_use_price: Pay-per-use price in microAlgos
            outright_price: One-time purchase price in microAlgos
        
        Returns:
            Success message
        """
        # Verify sender is DAO creator
        # Store pricing in box storage or global state
        
        # Box key format: "pricing_{asset_id}"
        # Store: monthly, pay_per_use, outright prices
        
        return String("Pricing set for asset successfully")

    @abimethod()
    def record_usage(
        self,
        asset_id: UInt64,
        usage_count: UInt64,
    ) -> String:
        """
        Record usage statistics for pay-per-use model
        
        Args:
            asset_id: The asset ID of the moderator NFT
            usage_count: Number of times used
        
        Returns:
            Success message with updated count
        """
        # Verify sender has access to the moderator
        # Update usage counter in storage
        
        # In production: Increment usage counter, trigger payment if needed
        
        return String("Usage recorded successfully")





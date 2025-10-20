from algopy import ARC4Contract, String, UInt64, Account, Global, Txn, gtxn, itxn, Bytes, BoxMap, GlobalState, op, subroutine
from algopy.arc4 import abimethod, Struct, UInt64 as ARC4UInt64, Address, Bool, String as ARC4String


class DAOConfig(Struct):
    """DAO configuration parameters"""
    min_members: ARC4UInt64
    min_stake: ARC4UInt64
    voting_period: ARC4UInt64
    activation_threshold: ARC4UInt64
    creator: Address


class ProposalData(Struct):
    """Proposal information"""
    dao_id: ARC4String
    title: ARC4String
    description: ARC4String
    creator: Address
    required_votes: ARC4UInt64
    current_votes: ARC4UInt64
    status: ARC4String  # "active", "passed", "rejected"
    created_at: ARC4UInt64


class CitadelDAO(ARC4Contract):
    """
    Enhanced CitadelDAO Smart Contract
    
    Manages DAO creation, membership, proposals, voting with proper payment handling,
    and revenue distribution with comprehensive state management
    """

    def __init__(self) -> None:
        # DAO configurations stored by DAO ID
        self.dao_configs = BoxMap(Bytes, DAOConfig, key_prefix=b"dao_config_")
        
        # Proposal data stored by proposal ID
        self.proposals = BoxMap(Bytes, ProposalData, key_prefix=b"proposal_")
        
        # Member stakes: dao_id + member_address -> stake_amount
        self.member_stakes = BoxMap(Bytes, UInt64, key_prefix=b"stake_")
        
        # Vote tracking: proposal_id + voter_address -> vote_cast (1 = yes, 2 = no, 0 = not voted)
        self.votes = BoxMap(Bytes, UInt64, key_prefix=b"vote_")
        
        # DAO treasury balances
        self.treasury_balances = BoxMap(Bytes, UInt64, key_prefix=b"treasury_")
        
        # Global counter for unique IDs
        self.dao_counter = GlobalState(UInt64(0), key="dao_counter")
        self.proposal_counter = GlobalState(UInt64(0), key="proposal_counter")

    @abimethod()
    def create_dao_proposal(
        self,
        dao_name: String,
        description: String,
        category: String,
        min_members: UInt64,
        min_stake: UInt64,
        voting_period: UInt64,
        activation_threshold: UInt64,
        payment_txn: gtxn.PaymentTransaction,
    ) -> String:
        """
        Create a DAO proposal with initial treasury contribution
        
        Args:
            dao_name: Name of the DAO
            description: DAO description
            category: AI moderator category
            min_members: Minimum members required
            min_stake: Minimum stake per member in microAlgos
            voting_period: Voting period in seconds
            activation_threshold: Percentage needed to pass (51-100)
            payment_txn: Initial treasury contribution payment
        
        Returns:
            DAO ID
        """
        # Validate inputs
        assert min_members >= 2, "Minimum 2 members required for DAO"
        assert min_stake >= 100000, "Minimum stake must be at least 0.1 ALGO"  # 0.1 ALGO
        assert activation_threshold >= 51 and activation_threshold <= 100, "Threshold must be between 51-100"
        assert voting_period >= 86400, "Voting period must be at least 1 day"  # 1 day in seconds
        
        # Verify payment transaction
        assert payment_txn.receiver == Global.current_application_address, "Payment must be to contract"
        assert payment_txn.sender == Txn.sender, "Payment sender must match transaction sender"
        assert payment_txn.amount >= min_stake, "Initial payment must meet minimum stake"
        
        # Generate unique DAO ID
        self.dao_counter.value += UInt64(1)
        dao_id_bytes = op.concat(Bytes(b"dao_"), op.itob(self.dao_counter.value))
        
        # Store DAO configuration
        dao_config = DAOConfig(
            min_members=ARC4UInt64(min_members),
            min_stake=ARC4UInt64(min_stake),
            voting_period=ARC4UInt64(voting_period),
            activation_threshold=ARC4UInt64(activation_threshold),
            creator=Address(Txn.sender)
        )
        self.dao_configs[dao_id_bytes] = dao_config.copy()
        
        # Record creator's stake
        member_key = dao_id_bytes + Txn.sender.bytes
        self.member_stakes[member_key] = payment_txn.amount
        
        # Initialize treasury with creator's contribution
        self.treasury_balances[dao_id_bytes] = payment_txn.amount
        
        return String.from_bytes(dao_id_bytes)

    @abimethod()
    def join_dao(
        self, 
        dao_id: String, 
        payment_txn: gtxn.PaymentTransaction
    ) -> String:
        """
        Join an existing DAO with required stake payment
        
        Args:
            dao_id: ID of the DAO to join
            payment_txn: Stake payment transaction
        
        Returns:
            Success message
        """
        dao_id_bytes = dao_id.bytes
        
        # Verify DAO exists (simplified check)
        assert dao_id_bytes in self.dao_configs, "DAO does not exist"
        dao_config = self.dao_configs[dao_id_bytes].copy()
        
        # Verify payment transaction
        assert payment_txn.receiver == Global.current_application_address, "Payment must be to contract"
        assert payment_txn.sender == Txn.sender, "Payment sender must match transaction sender"
        assert payment_txn.amount >= dao_config.min_stake.native, "Payment must meet minimum stake"
        
        # Check if already a member
        member_key = dao_id_bytes + Txn.sender.bytes
        existing_stake, is_member = self.member_stakes.maybe(member_key)
        assert not is_member, "Already a member of this DAO"
        
        # Record membership and stake
        self.member_stakes[member_key] = payment_txn.amount
        
        # Add to treasury
        current_treasury = self.treasury_balances[dao_id_bytes]
        self.treasury_balances[dao_id_bytes] = current_treasury + payment_txn.amount
        
        return String("Successfully joined DAO: ") + dao_id

    @abimethod()
    def create_proposal(
        self,
        dao_id: String,
        proposal_title: String,
        proposal_description: String,
        moderator_category: String,
    ) -> String:
        """
        Create a new proposal for DAO activation and AI moderator creation
        
        Args:
            dao_id: ID of the DAO
            proposal_title: Title of the proposal
            proposal_description: Description with context documents
            moderator_category: Category of AI moderator
        
        Returns:
            Proposal ID
        """
        dao_id_bytes = dao_id.bytes
        
        # Verify DAO exists (simplified check)
        assert dao_id_bytes in self.dao_configs, "DAO does not exist"
        dao_config = self.dao_configs[dao_id_bytes].copy()
        
        # Verify sender is DAO member
        member_key = dao_id_bytes + Txn.sender.bytes
        member_stake, is_member = self.member_stakes.maybe(member_key)
        assert is_member, "Only DAO members can create proposals"
        
        # Generate unique proposal ID
        self.proposal_counter.value += UInt64(1)
        proposal_id_bytes = op.concat(Bytes(b"prop_"), op.itob(self.proposal_counter.value))
        
        # Calculate required votes based on threshold
        # For simplicity, we'll use the minimum members as base
        required_votes = (dao_config.min_members.native * dao_config.activation_threshold.native) // UInt64(100)
        
        # Store proposal data
        proposal_data = ProposalData(
            dao_id=ARC4String.from_bytes(dao_id_bytes),
            title=ARC4String.from_bytes(proposal_title.bytes),
            description=ARC4String.from_bytes(proposal_description.bytes),
            creator=Address(Txn.sender),
            required_votes=ARC4UInt64(required_votes),
            current_votes=ARC4UInt64(0),
            status=ARC4String.from_bytes(Bytes(b"active")),
            created_at=ARC4UInt64(Global.latest_timestamp)
        )
        self.proposals[proposal_id_bytes] = proposal_data.copy()
        
        return String.from_bytes(proposal_id_bytes)

    @abimethod()
    def vote_on_proposal(
        self,
        proposal_id: String,
        vote_yes: Bool,
    ) -> String:
        """
        Cast a vote on a proposal (members can only vote once)
        
        Args:
            proposal_id: ID of the proposal
            vote_yes: True for yes, False for no
        
        Returns:
            Success message with updated vote count
        """
        proposal_id_bytes = proposal_id.bytes
        
        # Verify proposal exists (simplified check)
        assert proposal_id_bytes in self.proposals, "Proposal does not exist"
        proposal_data = self.proposals[proposal_id_bytes].copy()
        assert proposal_data.status.bytes == Bytes(b"active"), "Proposal is not active"
        
        # Verify sender is DAO member
        dao_id_bytes = proposal_data.dao_id.bytes
        member_key = dao_id_bytes + Txn.sender.bytes
        member_stake, is_member = self.member_stakes.maybe(member_key)
        assert is_member, "Only DAO members can vote"
        
        # Check if already voted
        vote_key = proposal_id_bytes + Txn.sender.bytes
        existing_vote, has_voted = self.votes.maybe(vote_key)
        assert not has_voted, "Already voted on this proposal"
        
        # Record vote (1 = yes, 2 = no)
        vote_value = UInt64(1) if vote_yes else UInt64(2)
        self.votes[vote_key] = vote_value
        
        # Update vote count (only count yes votes)
        if vote_yes:
            proposal_data.current_votes = ARC4UInt64(proposal_data.current_votes.native + UInt64(1))
            
            # Check if proposal passes
            if proposal_data.current_votes.native >= proposal_data.required_votes.native:
                proposal_data.status = ARC4String.from_bytes(Bytes(b"passed"))
        
        # Update proposal data
        self.proposals[proposal_id_bytes] = proposal_data.copy()
        
        vote_type = String("yes") if vote_yes else String("no")
        return String("Vote cast: ") + vote_type + String(", Total yes votes: ") + String.from_bytes(op.itob(proposal_data.current_votes.native))

    @abimethod()
    def execute_proposal(
        self,
        proposal_id: String,
        moderator_name: String,
    ) -> UInt64:
        """
        Execute a passed proposal and mint NFT for AI moderator
        
        Args:
            proposal_id: ID of the passed proposal
            moderator_name: Name for the AI moderator
        
        Returns:
            NFT Asset ID (mock for now)
        """
        proposal_id_bytes = proposal_id.bytes
        
        # Verify proposal exists and has passed (simplified check)
        assert proposal_id_bytes in self.proposals, "Proposal does not exist"
        proposal_data = self.proposals[proposal_id_bytes].copy()
        assert proposal_data.status.bytes == Bytes(b"passed"), "Proposal has not passed"
        
        # Verify sender is proposal creator or DAO member
        dao_id_bytes = proposal_data.dao_id.bytes
        member_key = dao_id_bytes + Txn.sender.bytes
        member_stake, is_member = self.member_stakes.maybe(member_key)
        assert is_member, "Only DAO members can execute proposals"
        
        # Create ASA (Algorand Standard Asset) for the moderator NFT
        nft_asset_id = self._create_moderator_nft(
            moderator_name,
            proposal_data.description.bytes,
            proposal_data.creator
        )
        
        # Mark proposal as executed (change status)
        proposal_data.status = ARC4String.from_bytes(Bytes(b"executed"))
        self.proposals[proposal_id_bytes] = proposal_data.copy()
        
        return nft_asset_id

    @abimethod()
    def distribute_revenue(
        self,
        dao_id: String,
        revenue_amount: UInt64,
    ) -> String:
        """
        Distribute revenue among DAO members proportionally
        
        Args:
            dao_id: ID of the DAO
            revenue_amount: Revenue to distribute in microAlgos
        
        Returns:
            Success message
        """
        dao_id_bytes = dao_id.bytes
        
        # Verify DAO exists (simplified check)
        assert dao_id_bytes in self.dao_configs, "DAO does not exist"
        
        # Add revenue to treasury (in production, this would come from external payments)
        current_treasury = self.treasury_balances[dao_id_bytes]
        self.treasury_balances[dao_id_bytes] = current_treasury + revenue_amount
        
        # In production: Calculate member shares and send payments via inner transactions
        # This would iterate through all members and send proportional payments
        
        return String("Revenue added to treasury for DAO: ") + dao_id

    @abimethod(readonly=True)
    def get_dao_info(self, dao_id: String) -> String:
        """
        Get DAO configuration and status
        
        Args:
            dao_id: ID of the DAO
        
        Returns:
            DAO information as formatted string
        """
        dao_id_bytes = dao_id.bytes
        
        if dao_id_bytes not in self.dao_configs:
            return String("DAO not found")
        
        dao_config = self.dao_configs[dao_id_bytes].copy()
        treasury_balance = self.treasury_balances[dao_id_bytes]
        
        return (String("DAO: ") + dao_id + 
                String(", Min Members: ") + String.from_bytes(op.itob(dao_config.min_members.native)) +
                String(", Min Stake: ") + String.from_bytes(op.itob(dao_config.min_stake.native)) +
                String(", Treasury: ") + String.from_bytes(op.itob(treasury_balance)))

    @abimethod(readonly=True)
    def get_proposal_info(self, proposal_id: String) -> String:
        """
        Get proposal details and voting status
        
        Args:
            proposal_id: ID of the proposal
        
        Returns:
            Proposal information as formatted string
        """
        proposal_id_bytes = proposal_id.bytes
        
        if proposal_id_bytes not in self.proposals:
            return String("Proposal not found")
        
        proposal_data = self.proposals[proposal_id_bytes].copy()
        
        return (String("Proposal: ") + String.from_bytes(proposal_data.title.bytes) +
                String(", Status: ") + String.from_bytes(proposal_data.status.bytes) +
                String(", Votes: ") + String.from_bytes(op.itob(proposal_data.current_votes.native)) +
                String("/") + String.from_bytes(op.itob(proposal_data.required_votes.native)))

    @abimethod(readonly=True)
    def check_membership(self, dao_id: String, member_address: Account) -> Bool:
        """
        Check if an address is a member of a DAO
        
        Args:
            dao_id: ID of the DAO
            member_address: Address to check
        
        Returns:
            True if member, False otherwise
        """
        dao_id_bytes = dao_id.bytes
        member_key = dao_id_bytes + member_address.bytes
        member_stake, is_member = self.member_stakes.maybe(member_key)
        return Bool(is_member)

    @abimethod(readonly=True)
    def get_treasury_balance(self, dao_id: String) -> UInt64:
        """
        Get DAO treasury balance
        
        Args:
            dao_id: ID of the DAO
        
        Returns:
            Treasury balance in microAlgos
        """
        dao_id_bytes = dao_id.bytes
        return self.treasury_balances[dao_id_bytes]

    @subroutine
    def _create_moderator_nft(
        self,
        moderator_name: String,
        description: Bytes,
        creator: Address,
    ) -> UInt64:
        """
        Create an ASA (NFT) for the AI moderator using inner transaction
        
        Args:
            moderator_name: Name of the AI moderator
            description: Description of the moderator
            creator: Address of the DAO creator
        
        Returns:
            Asset ID of the created NFT
        """
        # Create ASA (NFT) with inner transaction
        # The asset will be created and managed by the smart contract
        itxn.AssetConfig(
            total=UInt64(1),  # NFT - only 1 unit
            decimals=UInt64(0),  # NFT - no decimals
            default_frozen=False,
            asset_name=moderator_name.bytes,
            unit_name=Bytes(b"CITMOD"),
            url=Bytes(b"https://citadelx.ai/moderator/"),
            metadata_hash=op.sha256(description),
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
        ).submit()
        
        # Return a unique identifier for the created asset
        # In a real implementation, this would be the actual asset ID from the transaction
        # For now, we use a deterministic value based on the contract state
        return Global.latest_timestamp
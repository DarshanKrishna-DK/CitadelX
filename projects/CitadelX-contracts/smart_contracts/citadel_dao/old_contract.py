"""
CitadelX DAO Smart Contract
Built from scratch using Algorand DAO template best practices
Supports minimum member count of 1 for testing
"""

from algopy import *
from algopy.arc4 import abimethod, Struct, UInt64 as ARC4UInt64, Address, Bool, String as ARC4String


class DAOInfo(Struct):
    """Core DAO information structure"""
    name: ARC4String
    description: ARC4String
    creator: Address
    min_stake: ARC4UInt64          # Minimum stake in microAlgos
    voting_period: ARC4UInt64      # Voting period in seconds
    quorum_threshold: ARC4UInt64   # Percentage required for quorum (1-100)
    created_at: ARC4UInt64         # Creation timestamp
    is_active: Bool                # DAO status


class Member(Struct):
    """DAO member information"""
    address: Address
    stake: ARC4UInt64              # Member's stake amount
    joined_at: ARC4UInt64          # Join timestamp
    is_active: Bool                # Member status


class CitadelDAO(ARC4Contract):
    """
    CitadelX DAO Smart Contract
    
    Features:
    - Minimum member count: 1 (for testing)
    - Stake-based membership
    - Treasury management
    - Governance ready
    """

    def __init__(self) -> None:
        # Core DAO storage
        self.dao_info = GlobalState(DAOInfo)
        self.treasury_balance = GlobalState(UInt64, key="treasury")
        self.member_count = GlobalState(UInt64, key="members")
        self.total_stake = GlobalState(UInt64, key="total_stake")
        
        # Member tracking
        self.members = BoxMap(Address, Member, key_prefix=b"member_")
        
        # DAO initialization flag
        self.is_initialized = GlobalState(Bool, key="init")

    @abimethod()
    def initialize_dao(
        self,
        name: String,
        description: String,
        min_stake: UInt64,
        voting_period: UInt64,
        quorum_threshold: UInt64,
        initial_payment: gtxn.PaymentTransaction,
    ) -> String:
        """
        Initialize a new DAO with creator as first member
        
        Args:
            name: DAO name
            description: DAO description  
            min_stake: Minimum stake required (microAlgos)
            voting_period: Voting period in seconds (min 1 hour)
            quorum_threshold: Quorum percentage (1-100)
            initial_payment: Creator's initial stake payment
            
        Returns:
            Success message with DAO address
        """
        # Ensure DAO is not already initialized
        assert not self.is_initialized.value, "DAO already initialized"
        
        # Validate parameters - check if strings are not empty
        assert name != String(""), "DAO name cannot be empty"
        assert description != String(""), "DAO description cannot be empty"
        assert min_stake >= 100_000, "Minimum stake must be at least 0.1 ALGO"
        assert voting_period >= 3600, "Voting period must be at least 1 hour"
        assert 1 <= quorum_threshold <= 100, "Quorum threshold must be between 1-100%"
        
        # Validate payment transaction
        assert initial_payment.receiver == Global.current_application_address, "Payment must be to DAO contract"
        assert initial_payment.sender == Txn.sender, "Payment sender must match caller"
        assert initial_payment.amount >= min_stake, "Payment must meet minimum stake requirement"
        
        # Initialize DAO info
        dao_info = DAOInfo(
            name=ARC4String.from_bytes(name.bytes),
            description=ARC4String.from_bytes(description.bytes),
            creator=Address(Txn.sender),
            min_stake=ARC4UInt64(min_stake),
            voting_period=ARC4UInt64(voting_period),
            quorum_threshold=ARC4UInt64(quorum_threshold),
            created_at=ARC4UInt64(Global.latest_timestamp),
            is_active=Bool(True)
        )
        self.dao_info.value = dao_info
        
        # Add creator as first member
        creator_member = Member(
            address=Address(Txn.sender),
            stake=ARC4UInt64(initial_payment.amount),
            joined_at=ARC4UInt64(Global.latest_timestamp),
            is_active=Bool(True)
        )
        self.members[Address(Txn.sender)] = creator_member
        
        # Update counters
        self.member_count.value = UInt64(1)
        self.total_stake.value = initial_payment.amount
        self.treasury_balance.value = initial_payment.amount
        self.is_initialized.value = Bool(True)
        
        return String("DAO initialized successfully at ") + String.from_bytes(Global.current_application_address.bytes)

    @abimethod()
    def join_dao(self, payment: gtxn.PaymentTransaction) -> String:
        """
        Join the DAO as a new member
        
        Args:
            payment: Stake payment transaction
            
        Returns:
            Success message
        """
        assert self.is_initialized.value, "DAO not initialized"
        assert self.dao_info.value.is_active, "DAO is not active"
        
        # Validate payment
        assert payment.receiver == Global.current_application_address, "Payment must be to DAO contract"
        assert payment.sender == Txn.sender, "Payment sender must match caller"
        assert payment.amount >= self.dao_info.value.min_stake.native, "Payment must meet minimum stake"
        
        # Check if already a member
        existing_member, exists = self.members.maybe(Address(Txn.sender))
        assert not exists, "Already a DAO member"
        
        # Add new member
        new_member = Member(
            address=Address(Txn.sender),
            stake=ARC4UInt64(payment.amount),
            joined_at=ARC4UInt64(Global.latest_timestamp),
            is_active=Bool(True)
        )
        self.members[Address(Txn.sender)] = new_member
        
        # Update counters
        self.member_count.value += UInt64(1)
        self.total_stake.value += payment.amount
        self.treasury_balance.value += payment.amount
        
        return String("Successfully joined DAO")

    @abimethod()
    def increase_stake(self, payment: gtxn.PaymentTransaction) -> UInt64:
        """
        Increase member's stake in the DAO
        
        Args:
            payment: Additional stake payment
            
        Returns:
            New total stake amount
        """
        assert self.is_initialized.value, "DAO not initialized"
        
        # Validate payment
        assert payment.receiver == Global.current_application_address, "Payment must be to DAO contract"
        assert payment.sender == Txn.sender, "Payment sender must match caller"
        assert payment.amount > 0, "Payment amount must be positive"
        
        # Get existing member
        member, exists = self.members.maybe(Address(Txn.sender))
        assert exists, "Not a DAO member"
        assert member.is_active, "Member is not active"
        
        # Update member stake
        member.stake = ARC4UInt64(member.stake.native + payment.amount)
        self.members[Address(Txn.sender)] = member
        
        # Update totals
        self.total_stake.value += payment.amount
        self.treasury_balance.value += payment.amount
        
        return member.stake.native

    @abimethod()
    def leave_dao(self) -> String:
        """
        Leave the DAO and withdraw stake (if allowed)
        
        Returns:
            Success message
        """
        assert self.is_initialized.value, "DAO not initialized"
        
        # Get member info
        member, exists = self.members.maybe(Address(Txn.sender))
        assert exists, "Not a DAO member"
        assert member.is_active, "Member already inactive"
        
        # Cannot leave if you're the creator and only member
        dao_info = self.dao_info.value
        if dao_info.creator == Address(Txn.sender) and self.member_count.value == UInt64(1):
            assert False, "Creator cannot leave as the only member"
        
        # Mark member as inactive (stake remains in treasury for now)
        member.is_active = Bool(False)
        self.members[Address(Txn.sender)] = member
        
        # Update member count
        self.member_count.value -= UInt64(1)
        
        # TODO: Implement stake withdrawal logic based on governance rules
        
        return String("Successfully left DAO")

    @abimethod(readonly=True)
    def get_dao_info(self) -> DAOInfo:
        """Get DAO information"""
        assert self.is_initialized.value, "DAO not initialized"
        return self.dao_info.value

    @abimethod(readonly=True)
    def get_member_info(self, member_address: Address) -> Member:
        """Get member information"""
        assert self.is_initialized.value, "DAO not initialized"
        
        member, exists = self.members.maybe(member_address)
        assert exists, "Member not found"
        
        return member

    @abimethod(readonly=True)
    def is_member(self, address: Address) -> Bool:
        """Check if address is an active member"""
        if not self.is_initialized.value:
            return Bool(False)
            
        member, exists = self.members.maybe(address)
        if not exists:
            return Bool(False)
            
        return member.is_active

    @abimethod(readonly=True)
    def get_treasury_balance(self) -> UInt64:
        """Get current treasury balance"""
        assert self.is_initialized.value, "DAO not initialized"
        return self.treasury_balance.value

    @abimethod(readonly=True)
    def get_member_count(self) -> UInt64:
        """Get current active member count"""
        assert self.is_initialized.value, "DAO not initialized"
        return self.member_count.value

    @abimethod(readonly=True)
    def get_total_stake(self) -> UInt64:
        """Get total stake amount"""
        assert self.is_initialized.value, "DAO not initialized"
        return self.total_stake.value

    @abimethod()
    def emergency_pause(self) -> String:
        """Emergency pause (creator only)"""
        assert self.is_initialized.value, "DAO not initialized"
        
        dao_info = self.dao_info.value
        assert dao_info.creator == Address(Txn.sender), "Only creator can pause"
        
        dao_info.is_active = Bool(False)
        self.dao_info.value = dao_info
        
        return String("DAO paused")

    @abimethod()
    def emergency_unpause(self) -> String:
        """Emergency unpause (creator only)"""
        assert self.is_initialized.value, "DAO not initialized"
        
        dao_info = self.dao_info.value
        assert dao_info.creator == Address(Txn.sender), "Only creator can unpause"
        
        dao_info.is_active = Bool(True)
        self.dao_info.value = dao_info
        
        return String("DAO unpaused")

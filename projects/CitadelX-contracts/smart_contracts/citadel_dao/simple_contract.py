from algopy import (
    ARC4Contract,
    GlobalState,
    UInt64,
    String,
    Bytes,
    Txn,
    Global,
    arc4,
    gtxn,
    itxn,
    Address,
    Account,
)


class SimpleCitadelDAO(ARC4Contract):
    """
    Simplified CitadelX DAO Contract for testing and deployment
    
    This contract provides basic DAO functionality:
    - DAO creation and initialization
    - Member management (join/leave)
    - Basic treasury management
    - Emergency controls
    """

    def __init__(self) -> None:
        # Basic DAO information
        self.dao_name = GlobalState(Bytes)
        self.dao_description = GlobalState(Bytes)
        self.creator = GlobalState(Address)
        
        # DAO parameters
        self.min_stake = GlobalState(UInt64)
        self.voting_period = GlobalState(UInt64)
        self.quorum_threshold = GlobalState(UInt64)
        
        # DAO state
        self.member_count = GlobalState(UInt64)
        self.total_stake = GlobalState(UInt64)
        self.treasury_balance = GlobalState(UInt64)
        self.is_initialized = GlobalState(UInt64)  # 0 = false, 1 = true
        self.is_active = GlobalState(UInt64)       # 0 = false, 1 = true

    @arc4.abimethod(create="require")
    def create_dao(
        self,
        name: String,
        description: String,
        min_stake: UInt64,
        voting_period: UInt64,
        quorum_threshold: UInt64,
    ) -> String:
        """
        Create and initialize a new DAO
        
        Args:
            name: DAO name
            description: DAO description
            min_stake: Minimum stake required (microAlgos)
            voting_period: Voting period in seconds
            quorum_threshold: Quorum percentage (1-100)
            
        Returns:
            Success message
        """
        # Validate parameters
        assert min_stake >= 100_000, "Minimum stake must be at least 0.1 ALGO"
        assert voting_period >= 3600, "Voting period must be at least 1 hour"
        assert 1 <= quorum_threshold <= 100, "Quorum threshold must be between 1-100%"
        
        # Initialize DAO
        self.dao_name.value = name.bytes
        self.dao_description.value = description.bytes
        self.creator.value = Address(Txn.sender)
        self.min_stake.value = min_stake
        self.voting_period.value = voting_period
        self.quorum_threshold.value = quorum_threshold
        
        # Initialize counters
        self.member_count.value = UInt64(0)
        self.total_stake.value = UInt64(0)
        self.treasury_balance.value = UInt64(0)
        self.is_initialized.value = UInt64(1)
        self.is_active.value = UInt64(1)
        
        return String("DAO created successfully")

    @arc4.abimethod
    def join_dao(self, payment: gtxn.PaymentTransaction) -> String:
        """
        Join the DAO by paying the minimum stake
        
        Args:
            payment: Payment transaction with minimum stake
            
        Returns:
            Success message
        """
        # Validate DAO is initialized and active
        assert self.is_initialized.value == UInt64(1), "DAO not initialized"
        assert self.is_active.value == UInt64(1), "DAO not active"
        
        # Validate payment
        assert payment.receiver == Global.current_application_address, "Payment must be to DAO contract"
        assert payment.sender == Txn.sender, "Payment sender must match caller"
        assert payment.amount >= self.min_stake.value, "Payment must meet minimum stake"
        
        # Update counters
        self.member_count.value += UInt64(1)
        self.total_stake.value += payment.amount
        self.treasury_balance.value += payment.amount
        
        return String("Successfully joined DAO")

    @arc4.abimethod
    def leave_dao(self, refund_amount: UInt64) -> String:
        """
        Leave the DAO and get refund
        
        Args:
            refund_amount: Amount to refund (microAlgos)
            
        Returns:
            Success message
        """
        # Validate DAO state
        assert self.is_initialized.value == UInt64(1), "DAO not initialized"
        assert self.member_count.value > UInt64(0), "No members to remove"
        assert refund_amount <= self.treasury_balance.value, "Insufficient treasury balance"
        
        # Send refund
        itxn.Payment(
            receiver=Txn.sender,
            amount=refund_amount,
            note=b"DAO member refund"
        ).submit()
        
        # Update counters
        self.member_count.value -= UInt64(1)
        self.total_stake.value -= refund_amount
        self.treasury_balance.value -= refund_amount
        
        return String("Successfully left DAO")

    @arc4.abimethod
    def emergency_pause(self) -> String:
        """
        Emergency pause - only creator can call
        
        Returns:
            Success message
        """
        assert Txn.sender == self.creator.value, "Only creator can pause DAO"
        
        self.is_active.value = UInt64(0)
        
        return String("DAO paused")

    @arc4.abimethod
    def emergency_unpause(self) -> String:
        """
        Emergency unpause - only creator can call
        
        Returns:
            Success message
        """
        assert Txn.sender == self.creator.value, "Only creator can unpause DAO"
        
        self.is_active.value = UInt64(1)
        
        return String("DAO unpaused")

    @arc4.abimethod(readonly=True)
    def get_dao_info(self) -> arc4.Tuple[
        arc4.String,    # name
        arc4.String,    # description
        arc4.Address,   # creator
        arc4.UInt64,    # min_stake
        arc4.UInt64,    # voting_period
        arc4.UInt64,    # quorum_threshold
        arc4.UInt64,    # member_count
        arc4.UInt64,    # total_stake
        arc4.UInt64,    # treasury_balance
        arc4.Bool,      # is_active
    ]:
        """
        Get DAO information (read-only)
        
        Returns:
            Tuple with DAO information
        """
        return arc4.Tuple((
            arc4.String.from_bytes(self.dao_name.value),
            arc4.String.from_bytes(self.dao_description.value),
            arc4.Address(self.creator.value),
            arc4.UInt64(self.min_stake.value),
            arc4.UInt64(self.voting_period.value),
            arc4.UInt64(self.quorum_threshold.value),
            arc4.UInt64(self.member_count.value),
            arc4.UInt64(self.total_stake.value),
            arc4.UInt64(self.treasury_balance.value),
            arc4.Bool(self.is_active.value == UInt64(1)),
        ))

    @arc4.abimethod
    def withdraw_treasury(self, amount: UInt64, recipient: Address) -> String:
        """
        Withdraw from treasury - only creator can call
        
        Args:
            amount: Amount to withdraw (microAlgos)
            recipient: Recipient address
            
        Returns:
            Success message
        """
        assert Txn.sender == self.creator.value, "Only creator can withdraw"
        assert amount <= self.treasury_balance.value, "Insufficient treasury balance"
        
        # Send payment
        itxn.Payment(
            receiver=recipient,
            amount=amount,
            note=b"Treasury withdrawal"
        ).submit()
        
        # Update treasury balance
        self.treasury_balance.value -= amount
        
        return String("Treasury withdrawal successful")

    @arc4.abimethod(readonly=True)
    def get_treasury_balance(self) -> arc4.UInt64:
        """
        Get current treasury balance
        
        Returns:
            Treasury balance in microAlgos
        """
        return arc4.UInt64(self.treasury_balance.value)

    @arc4.abimethod(readonly=True)
    def is_dao_active(self) -> arc4.Bool:
        """
        Check if DAO is active
        
        Returns:
            True if DAO is active, False otherwise
        """
        return arc4.Bool(
            self.is_initialized.value == UInt64(1) and 
            self.is_active.value == UInt64(1)
        )

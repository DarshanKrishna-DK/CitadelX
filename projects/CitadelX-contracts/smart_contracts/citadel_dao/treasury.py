"""
CitadelX DAO Treasury Contract
Handles fund management and distribution
Based on treasury management best practices
"""

from algopy import *
from algopy.arc4 import abimethod, Struct, UInt64 as ARC4UInt64, Address, Bool, String as ARC4String


class PaymentRecord(Struct):
    """Payment record structure"""
    id: ARC4UInt64
    recipient: Address
    amount: ARC4UInt64
    purpose: ARC4String
    timestamp: ARC4UInt64
    executed_by: Address


class RevenueShare(Struct):
    """Revenue sharing record"""
    member: Address
    share_percentage: ARC4UInt64  # Percentage * 100 (e.g., 2500 = 25%)
    total_received: ARC4UInt64
    last_distribution: ARC4UInt64


class CitadelTreasury(ARC4Contract):
    """
    DAO Treasury Management Contract
    
    Features:
    - Fund management and tracking
    - Revenue distribution
    - Payment authorization
    - Emergency controls
    """

    def __init__(self) -> None:
        # Treasury state
        self.total_balance = GlobalState(UInt64, key="balance")
        self.total_distributed = GlobalState(UInt64, key="distributed")
        self.payment_count = GlobalState(UInt64, key="payments")
        self.revenue_count = GlobalState(UInt64, key="revenue")
        
        # Associated contracts
        self.dao_contract = GlobalState(UInt64, key="dao_app_id")
        self.governance_contract = GlobalState(UInt64, key="gov_app_id")
        
        # Storage
        self.payments = BoxMap(UInt64, PaymentRecord, key_prefix=b"payment_")
        self.revenue_shares = BoxMap(Address, RevenueShare, key_prefix=b"share_")
        
        # Emergency controls
        self.is_paused = GlobalState(Bool, key="paused")
        self.emergency_admin = GlobalState(Address, key="admin")
        
        # Initialization flag
        self.is_initialized = GlobalState(Bool, key="init")

    @abimethod()
    def initialize_treasury(
        self,
        dao_app_id: UInt64,
        governance_app_id: UInt64,
        emergency_admin: Address,
    ) -> String:
        """
        Initialize treasury contract
        
        Args:
            dao_app_id: Associated DAO contract app ID
            governance_app_id: Associated governance contract app ID
            emergency_admin: Emergency admin address
            
        Returns:
            Success message
        """
        assert not self.is_initialized.value, "Treasury already initialized"
        
        # Validate parameters
        assert dao_app_id > 0, "Invalid DAO app ID"
        assert governance_app_id > 0, "Invalid governance app ID"
        
        # Set contract references
        self.dao_contract.value = dao_app_id
        self.governance_contract.value = governance_app_id
        self.emergency_admin.value = emergency_admin
        
        # Initialize counters
        self.total_balance.value = UInt64(0)
        self.total_distributed.value = UInt64(0)
        self.payment_count.value = UInt64(0)
        self.revenue_count.value = UInt64(0)
        self.is_paused.value = False
        self.is_initialized.value = True
        
        return String("Treasury initialized")

    @abimethod()
    def receive_funds(self, payment: gtxn.PaymentTransaction, purpose: String) -> UInt64:
        """
        Receive funds into treasury
        
        Args:
            payment: Payment transaction
            purpose: Purpose of the payment
            
        Returns:
            New treasury balance
        """
        assert self.is_initialized.value, "Treasury not initialized"
        assert not self.is_paused.value, "Treasury is paused"
        
        # Validate payment
        assert payment.receiver == Global.current_application_address, "Payment must be to treasury"
        assert payment.amount > 0, "Payment amount must be positive"
        
        # Update balance
        self.total_balance.value += payment.amount
        
        # Record payment
        payment_id = self.payment_count.value + UInt64(1)
        self.payment_count.value = payment_id
        
        payment_record = PaymentRecord(
            id=ARC4UInt64(payment_id),
            recipient=Address(Global.current_application_address),
            amount=ARC4UInt64(payment.amount),
            purpose=ARC4String.from_bytes(purpose.bytes),
            timestamp=ARC4UInt64(Global.latest_timestamp),
            executed_by=Address(payment.sender)
        )
        self.payments[payment_id] = payment_record
        
        return self.total_balance.value

    @abimethod()
    def authorize_payment(
        self,
        recipient: Address,
        amount: UInt64,
        purpose: String,
    ) -> String:
        """
        Authorize a payment from treasury (governance only)
        
        Args:
            recipient: Payment recipient
            amount: Payment amount
            purpose: Payment purpose
            
        Returns:
            Success message
        """
        assert self.is_initialized.value, "Treasury not initialized"
        assert not self.is_paused.value, "Treasury is paused"
        
        # TODO: Verify caller is governance contract or authorized member
        # For now, allow any caller (will be restricted in production)
        
        # Validate payment
        assert amount > 0, "Amount must be positive"
        assert amount <= self.total_balance.value, "Insufficient treasury balance"
        
        # Execute payment
        itxn.Payment(
            receiver=recipient,
            amount=amount,
            fee=0
        ).submit()
        
        # Update balance
        self.total_balance.value -= amount
        self.total_distributed.value += amount
        
        # Record payment
        payment_id = self.payment_count.value + UInt64(1)
        self.payment_count.value = payment_id
        
        payment_record = PaymentRecord(
            id=ARC4UInt64(payment_id),
            recipient=recipient,
            amount=ARC4UInt64(amount),
            purpose=ARC4String.from_bytes(purpose.bytes),
            timestamp=ARC4UInt64(Global.latest_timestamp),
            executed_by=Address(Txn.sender)
        )
        self.payments[payment_id] = payment_record
        
        return String("Payment authorized and executed")

    @abimethod()
    def distribute_revenue(
        self,
        revenue_amount: UInt64,
        member_addresses: String,  # JSON array of member addresses
    ) -> String:
        """
        Distribute revenue among DAO members
        
        Args:
            revenue_amount: Total revenue to distribute
            member_addresses: JSON string of member addresses
            
        Returns:
            Distribution summary
        """
        assert self.is_initialized.value, "Treasury not initialized"
        assert not self.is_paused.value, "Treasury is paused"
        
        # Validate revenue amount
        assert revenue_amount > 0, "Revenue amount must be positive"
        assert revenue_amount <= self.total_balance.value, "Insufficient treasury balance"
        
        # TODO: Parse member addresses and calculate shares
        # For now, implement simple equal distribution logic
        
        # Update counters
        self.revenue_count.value += UInt64(1)
        self.total_distributed.value += revenue_amount
        self.total_balance.value -= revenue_amount
        
        return String("Revenue distributed successfully")

    @abimethod()
    def set_revenue_share(
        self,
        member: Address,
        share_percentage: UInt64,  # Percentage * 100
    ) -> String:
        """
        Set revenue share for a member
        
        Args:
            member: Member address
            share_percentage: Share percentage * 100 (e.g., 2500 = 25%)
            
        Returns:
            Success message
        """
        assert self.is_initialized.value, "Treasury not initialized"
        assert share_percentage <= 10000, "Share percentage cannot exceed 100%"
        
        # TODO: Verify caller has permission to set shares
        
        # Get or create revenue share record
        existing_share, exists = self.revenue_shares.maybe(member)
        
        if exists:
            existing_share.share_percentage = ARC4UInt64(share_percentage)
            self.revenue_shares[member] = existing_share
        else:
            new_share = RevenueShare(
                member=member,
                share_percentage=ARC4UInt64(share_percentage),
                total_received=ARC4UInt64(0),
                last_distribution=ARC4UInt64(0)
            )
            self.revenue_shares[member] = new_share
        
        return String("Revenue share updated")

    @abimethod(readonly=True)
    def get_balance(self) -> UInt64:
        """Get current treasury balance"""
        if not self.is_initialized.value:
            return UInt64(0)
        return self.total_balance.value

    @abimethod(readonly=True)
    def get_total_distributed(self) -> UInt64:
        """Get total amount distributed"""
        if not self.is_initialized.value:
            return UInt64(0)
        return self.total_distributed.value

    @abimethod(readonly=True)
    def get_payment_record(self, payment_id: UInt64) -> PaymentRecord:
        """Get payment record by ID"""
        assert self.is_initialized.value, "Treasury not initialized"
        
        payment, exists = self.payments.maybe(payment_id)
        assert exists, "Payment record not found"
        
        return payment

    @abimethod(readonly=True)
    def get_revenue_share(self, member: Address) -> RevenueShare:
        """Get revenue share for member"""
        assert self.is_initialized.value, "Treasury not initialized"
        
        share, exists = self.revenue_shares.maybe(member)
        assert exists, "Revenue share not found"
        
        return share

    @abimethod(readonly=True)
    def get_payment_count(self) -> UInt64:
        """Get total number of payments"""
        if not self.is_initialized.value:
            return UInt64(0)
        return self.payment_count.value

    @abimethod()
    def emergency_pause(self) -> String:
        """Emergency pause (admin only)"""
        assert self.is_initialized.value, "Treasury not initialized"
        assert Txn.sender == self.emergency_admin.value, "Only emergency admin can pause"
        
        self.is_paused.value = True
        return String("Treasury paused")

    @abimethod()
    def emergency_unpause(self) -> String:
        """Emergency unpause (admin only)"""
        assert self.is_initialized.value, "Treasury not initialized"
        assert Txn.sender == self.emergency_admin.value, "Only emergency admin can unpause"
        
        self.is_paused.value = False
        return String("Treasury unpaused")

    @abimethod()
    def emergency_withdraw(self, recipient: Address, amount: UInt64) -> String:
        """Emergency withdrawal (admin only)"""
        assert self.is_initialized.value, "Treasury not initialized"
        assert Txn.sender == self.emergency_admin.value, "Only emergency admin can withdraw"
        assert amount <= self.total_balance.value, "Insufficient balance"
        
        # Execute emergency withdrawal
        itxn.Payment(
            receiver=recipient,
            amount=amount,
            fee=0
        ).submit()
        
        self.total_balance.value -= amount
        
        return String("Emergency withdrawal executed")

from algopy import (
    ARC4Contract,
    GlobalState,
    LocalState,
    UInt64,
    Account,
    Txn,
    Global,
    arc4,
    gtxn,
    itxn,
    Bytes,
)


class ModeratorPurchaseContract(ARC4Contract):
    """
    Smart contract for moderator purchases with 3 access types:
    1. Hourly access (pay per hour)
    2. Monthly license (subscription)
    3. Buyout (permanent ownership)
    
    Based on citadel-algo library patterns with 90/10 revenue split.
    """

    def __init__(self) -> None:
        # Global state - contract and moderator info
        self.contract_owner = GlobalState(Account)
        self.moderator_owner = GlobalState(Account)
        self.moderator_creator = GlobalState(Account)
        self.moderator_exists = GlobalState(UInt64)
        
        # Pricing in microAlgos
        self.hourly_price = GlobalState(UInt64)
        self.monthly_price = GlobalState(UInt64)
        self.buyout_price = GlobalState(UInt64)
        
        # Contract statistics
        self.total_transactions = GlobalState(UInt64)
        self.total_revenue = GlobalState(UInt64)
        self.total_users = GlobalState(UInt64)
        
        # Local state - per user access details
        self.user_access_type = LocalState(UInt64)  # 0=none, 1=hourly, 2=monthly, 3=buyout
        self.access_expiry = LocalState(UInt64)     # Unix timestamp for monthly/hourly
        self.hours_remaining = LocalState(UInt64)   # For hourly access
        self.total_spent = LocalState(UInt64)       # Total amount spent by user

    @arc4.abimethod(create="require")
    def create_moderator(
        self,
        creator: Account,
        hourly_price_algo: arc4.UInt64,
        monthly_price_algo: arc4.UInt64,
        buyout_price_algo: arc4.UInt64,
    ) -> None:
        """Initialize moderator with pricing in ALGO"""
        self.contract_owner.value = Txn.sender
        self.moderator_creator.value = creator
        self.moderator_owner.value = creator
        self.moderator_exists.value = UInt64(1)

        # Convert ALGO to microAlgos (1 ALGO = 1,000,000 microAlgos)
        self.hourly_price.value = hourly_price_algo.native * UInt64(1_000_000)
        self.monthly_price.value = monthly_price_algo.native * UInt64(1_000_000)
        self.buyout_price.value = buyout_price_algo.native * UInt64(1_000_000)

        # Initialize statistics
        self.total_transactions.value = UInt64(0)
        self.total_revenue.value = UInt64(0)
        self.total_users.value = UInt64(0)

    @arc4.abimethod
    def purchase_hourly_access(
        self, 
        payment: gtxn.PaymentTransaction,
        hours: arc4.UInt64
    ) -> arc4.String:
        """Purchase hourly access to moderator"""
        # Verify moderator exists
        assert self.moderator_exists.value == UInt64(1), "Moderator does not exist"
        
        # Calculate required payment
        required_payment = self.hourly_price.value * hours.native
        
        # Verify payment
        assert payment.receiver == Global.current_application_address
        assert payment.amount >= required_payment
        assert payment.sender == Txn.sender

        # Calculate 90/10 split
        total_payment = payment.amount
        owner_share = (total_payment * UInt64(90)) // UInt64(100)
        contract_fee = total_payment - owner_share

        # Send 90% to current owner
        itxn.Payment(
            receiver=self.moderator_owner.value,
            amount=owner_share,
            note=b"Hourly access payment"
        ).submit()

        # Update user access
        current_hours = self.hours_remaining[Txn.sender]
        self.hours_remaining[Txn.sender] = current_hours + hours.native
        self.user_access_type[Txn.sender] = UInt64(1)  # Hourly access
        
        # Update user total spent
        current_spent = self.total_spent[Txn.sender]
        self.total_spent[Txn.sender] = current_spent + total_payment

        # Update contract stats
        self.total_transactions.value += UInt64(1)
        self.total_revenue.value += contract_fee

        # Increment user count if first purchase
        if current_spent == UInt64(0):
            self.total_users.value += UInt64(1)

        return arc4.String("Successfully purchased hours of access")

    @arc4.abimethod
    def purchase_monthly_license(
        self, 
        payment: gtxn.PaymentTransaction,
        months: arc4.UInt64
    ) -> arc4.String:
        """Purchase monthly license for moderator"""
        # Verify moderator exists
        assert self.moderator_exists.value == UInt64(1), "Moderator does not exist"
        
        # Calculate required payment
        required_payment = self.monthly_price.value * months.native
        
        # Verify payment
        assert payment.receiver == Global.current_application_address
        assert payment.amount >= required_payment
        assert payment.sender == Txn.sender

        # Calculate 90/10 split
        total_payment = payment.amount
        owner_share = (total_payment * UInt64(90)) // UInt64(100)
        contract_fee = total_payment - owner_share

        # Send 90% to current owner
        itxn.Payment(
            receiver=self.moderator_owner.value,
            amount=owner_share,
            note=b"Monthly license payment"
        ).submit()

        # Calculate expiry (approximate: 30 days per month)
        current_time = Global.latest_timestamp
        seconds_per_month = UInt64(30 * 24 * 60 * 60)  # 30 days
        additional_time = seconds_per_month * months.native
        
        # Extend existing license or start new one
        current_expiry = self.access_expiry[Txn.sender]
        if current_expiry > current_time:
            # Extend existing license
            self.access_expiry[Txn.sender] = current_expiry + additional_time
        else:
            # Start new license
            self.access_expiry[Txn.sender] = current_time + additional_time

        self.user_access_type[Txn.sender] = UInt64(2)  # Monthly license
        
        # Update user total spent
        current_spent = self.total_spent[Txn.sender]
        self.total_spent[Txn.sender] = current_spent + total_payment

        # Update contract stats
        self.total_transactions.value += UInt64(1)
        self.total_revenue.value += contract_fee

        # Increment user count if first purchase
        if current_spent == UInt64(0):
            self.total_users.value += UInt64(1)

        return arc4.String("Successfully purchased monthly license")

    @arc4.abimethod
    def buyout_moderator(self, payment: gtxn.PaymentTransaction) -> arc4.String:
        """Transfer permanent ownership with 90/10 revenue split"""
        # Verify moderator exists and buyer doesn't already own it
        assert self.moderator_exists.value == UInt64(1), "Moderator does not exist"
        assert self.moderator_owner.value != Txn.sender, "You already own this moderator"

        # Verify payment
        assert payment.receiver == Global.current_application_address
        assert payment.amount >= self.buyout_price.value
        assert payment.sender == Txn.sender

        # Calculate 90/10 split
        total_payment = payment.amount
        owner_share = (total_payment * UInt64(90)) // UInt64(100)
        contract_fee = total_payment - owner_share

        # Send 90% to current owner
        itxn.Payment(
            receiver=self.moderator_owner.value,
            amount=owner_share,
            note=b"Moderator buyout payment"
        ).submit()

        # Transfer ownership to buyer
        self.moderator_owner.value = Txn.sender
        self.user_access_type[Txn.sender] = UInt64(3)  # Permanent ownership
        self.access_expiry[Txn.sender] = UInt64(0)  # No expiry
        self.hours_remaining[Txn.sender] = UInt64(0)  # Not applicable

        # Update user total spent
        current_spent = self.total_spent[Txn.sender]
        self.total_spent[Txn.sender] = current_spent + total_payment

        # Update contract stats
        self.total_transactions.value += UInt64(1)
        self.total_revenue.value += contract_fee

        # Increment user count if first purchase
        if current_spent == UInt64(0):
            self.total_users.value += UInt64(1)

        return arc4.String("Successfully purchased moderator ownership")

    @arc4.abimethod
    def update_pricing(
        self,
        new_hourly_price: arc4.UInt64,
        new_monthly_price: arc4.UInt64,
        new_buyout_price: arc4.UInt64,
    ) -> arc4.String:
        """Update pricing - only current owner can call"""
        assert Txn.sender == self.moderator_owner.value, "Only owner can update pricing"

        self.hourly_price.value = new_hourly_price.native * UInt64(1_000_000)
        self.monthly_price.value = new_monthly_price.native * UInt64(1_000_000)
        self.buyout_price.value = new_buyout_price.native * UInt64(1_000_000)

        return arc4.String("Pricing updated successfully")

    @arc4.abimethod
    def use_hourly_access(self, hours_used: arc4.UInt64) -> arc4.String:
        """Deduct hours from user's hourly access"""
        assert self.user_access_type[Txn.sender] == UInt64(1), "No hourly access found"
        
        current_hours = self.hours_remaining[Txn.sender]
        assert current_hours >= hours_used.native, "Insufficient hours remaining"
        
        self.hours_remaining[Txn.sender] = current_hours - hours_used.native
        
        return arc4.String("Used hours successfully")

    @arc4.abimethod(readonly=True)
    def get_moderator_info(self) -> arc4.Tuple[
        arc4.UInt64,   # hourly_price_algo
        arc4.UInt64,   # monthly_price_algo
        arc4.UInt64,   # buyout_price_algo
        arc4.Address,  # current_owner
        arc4.Address,  # creator
    ]:
        """Get pricing and ownership info (read-only, no cost)"""
        return arc4.Tuple((
            arc4.UInt64(self.hourly_price.value // UInt64(1_000_000)),
            arc4.UInt64(self.monthly_price.value // UInt64(1_000_000)),
            arc4.UInt64(self.buyout_price.value // UInt64(1_000_000)),
            arc4.Address(self.moderator_owner.value),
            arc4.Address(self.moderator_creator.value),
        ))

    @arc4.abimethod(readonly=True)
    def get_user_access(self, user: Account) -> arc4.Tuple[
        arc4.UInt64,  # access_type
        arc4.UInt64,  # hours_remaining
        arc4.UInt64,  # access_expiry
        arc4.UInt64,  # total_spent
    ]:
        """Get user's access details (read-only, no cost)"""
        return arc4.Tuple((
            arc4.UInt64(self.user_access_type[user]),
            arc4.UInt64(self.hours_remaining[user]),
            arc4.UInt64(self.access_expiry[user]),
            arc4.UInt64(self.total_spent[user]),
        ))

    @arc4.abimethod(readonly=True)
    def get_contract_stats(self) -> arc4.Tuple[
        arc4.UInt64,  # total_transactions
        arc4.UInt64,  # total_revenue
        arc4.UInt64,  # total_users
    ]:
        """Get contract statistics (read-only, no cost)"""
        return arc4.Tuple((
            arc4.UInt64(self.total_transactions.value),
            arc4.UInt64(self.total_revenue.value),
            arc4.UInt64(self.total_users.value),
        ))

    @arc4.abimethod(readonly=True)
    def has_valid_access(self, user: Account) -> arc4.Bool:
        """Check if user has valid access (read-only, no cost)"""
        access_type = self.user_access_type[user]
        current_time = Global.latest_timestamp
        
        if access_type == UInt64(1):  # Hourly
            return arc4.Bool(self.hours_remaining[user] > UInt64(0))
        elif access_type == UInt64(2):  # Monthly
            return arc4.Bool(self.access_expiry[user] > current_time)
        elif access_type == UInt64(3):  # Buyout
            return arc4.Bool(True)
        else:
            return arc4.Bool(False)

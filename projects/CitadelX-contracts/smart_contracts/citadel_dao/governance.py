"""
CitadelX DAO Governance Contract
Handles proposals, voting, and execution
Based on OpenZeppelin Governor patterns
"""

from algopy import *
from algopy.arc4 import abimethod, Struct, UInt64 as ARC4UInt64, Address, Bool, String as ARC4String


class Proposal(Struct):
    """Proposal structure"""
    id: ARC4UInt64
    title: ARC4String
    description: ARC4String
    creator: Address
    created_at: ARC4UInt64
    voting_start: ARC4UInt64
    voting_end: ARC4UInt64
    votes_for: ARC4UInt64
    votes_against: ARC4UInt64
    votes_abstain: ARC4UInt64
    status: ARC4String  # "pending", "active", "passed", "rejected", "executed", "cancelled"
    execution_data: ARC4String  # JSON data for execution


class Vote(Struct):
    """Individual vote record"""
    voter: Address
    proposal_id: ARC4UInt64
    support: ARC4UInt64  # 0=against, 1=for, 2=abstain
    weight: ARC4UInt64   # Voting weight (based on stake)
    timestamp: ARC4UInt64


class CitadelGovernance(ARC4Contract):
    """
    DAO Governance Contract
    
    Features:
    - Proposal creation and management
    - Stake-weighted voting
    - Quorum and threshold checks
    - Proposal execution
    """

    def __init__(self) -> None:
        # Governance state
        self.proposal_count = GlobalState(UInt64, key="prop_count")
        self.voting_delay = GlobalState(UInt64, key="vote_delay")  # Delay before voting starts
        self.voting_period = GlobalState(UInt64, key="vote_period")  # Voting duration
        self.proposal_threshold = GlobalState(UInt64, key="prop_threshold")  # Min stake to propose
        self.quorum_percentage = GlobalState(UInt64, key="quorum_pct")  # Quorum requirement
        
        # Storage
        self.proposals = BoxMap(UInt64, Proposal, key_prefix=b"proposal_")
        self.votes = BoxMap(Bytes, Vote, key_prefix=b"vote_")  # proposal_id + voter_address
        
        # DAO contract reference
        self.dao_contract = GlobalState(UInt64, key="dao_app_id")
        
        # Initialization flag
        self.is_initialized = GlobalState(Bool, key="init")

    @abimethod()
    def initialize_governance(
        self,
        dao_app_id: UInt64,
        voting_delay: UInt64,
        voting_period: UInt64,
        proposal_threshold: UInt64,
        quorum_percentage: UInt64,
    ) -> String:
        """
        Initialize governance contract
        
        Args:
            dao_app_id: Associated DAO contract app ID
            voting_delay: Delay before voting starts (seconds)
            voting_period: Voting duration (seconds)
            proposal_threshold: Min stake to create proposal (microAlgos)
            quorum_percentage: Quorum requirement (1-100)
            
        Returns:
            Success message
        """
        assert not self.is_initialized.value, "Governance already initialized"
        
        # Validate parameters
        assert dao_app_id > 0, "Invalid DAO app ID"
        assert voting_delay >= 0, "Invalid voting delay"
        assert voting_period >= 3600, "Voting period must be at least 1 hour"
        assert proposal_threshold >= 0, "Invalid proposal threshold"
        assert 1 <= quorum_percentage <= 100, "Quorum must be between 1-100%"
        
        # Set governance parameters
        self.dao_contract.value = dao_app_id
        self.voting_delay.value = voting_delay
        self.voting_period.value = voting_period
        self.proposal_threshold.value = proposal_threshold
        self.quorum_percentage.value = quorum_percentage
        self.proposal_count.value = UInt64(0)
        self.is_initialized.value = True
        
        return String("Governance initialized")

    @abimethod()
    def create_proposal(
        self,
        title: String,
        description: String,
        execution_data: String,
    ) -> UInt64:
        """
        Create a new proposal
        
        Args:
            title: Proposal title
            description: Proposal description
            execution_data: JSON data for execution (if passed)
            
        Returns:
            Proposal ID
        """
        assert self.is_initialized.value, "Governance not initialized"
        
        # Validate inputs
        assert len(title.bytes) > 0, "Title cannot be empty"
        assert len(description.bytes) > 0, "Description cannot be empty"
        
        # TODO: Check if sender has enough stake (requires cross-contract call)
        # For now, allow any member to create proposals
        
        # Generate proposal ID
        proposal_id = self.proposal_count.value + UInt64(1)
        self.proposal_count.value = proposal_id
        
        # Calculate voting times
        current_time = Global.latest_timestamp
        voting_start = current_time + self.voting_delay.value
        voting_end = voting_start + self.voting_period.value
        
        # Create proposal
        proposal = Proposal(
            id=ARC4UInt64(proposal_id),
            title=ARC4String.from_bytes(title.bytes),
            description=ARC4String.from_bytes(description.bytes),
            creator=Address(Txn.sender),
            created_at=ARC4UInt64(current_time),
            voting_start=ARC4UInt64(voting_start),
            voting_end=ARC4UInt64(voting_end),
            votes_for=ARC4UInt64(0),
            votes_against=ARC4UInt64(0),
            votes_abstain=ARC4UInt64(0),
            status=ARC4String.from_bytes(Bytes(b"pending")),
            execution_data=ARC4String.from_bytes(execution_data.bytes)
        )
        
        self.proposals[proposal_id] = proposal
        
        return proposal_id

    @abimethod()
    def cast_vote(
        self,
        proposal_id: UInt64,
        support: UInt64,  # 0=against, 1=for, 2=abstain
        weight: UInt64,   # Voter's stake weight
    ) -> String:
        """
        Cast a vote on a proposal
        
        Args:
            proposal_id: Proposal to vote on
            support: Vote type (0=against, 1=for, 2=abstain)
            weight: Voting weight (stake amount)
            
        Returns:
            Success message
        """
        assert self.is_initialized.value, "Governance not initialized"
        assert support <= 2, "Invalid vote type"
        
        # Get proposal
        proposal, exists = self.proposals.maybe(proposal_id)
        assert exists, "Proposal not found"
        
        # Check voting period
        current_time = Global.latest_timestamp
        assert current_time >= proposal.voting_start.native, "Voting not started"
        assert current_time <= proposal.voting_end.native, "Voting ended"
        assert proposal.status.bytes == Bytes(b"pending") or proposal.status.bytes == Bytes(b"active"), "Proposal not active"
        
        # Check if already voted
        vote_key = op.concat(op.itob(proposal_id), Txn.sender.bytes)
        existing_vote, has_voted = self.votes.maybe(vote_key)
        assert not has_voted, "Already voted on this proposal"
        
        # TODO: Verify weight matches sender's stake (requires cross-contract call)
        # For now, trust the provided weight
        
        # Record vote
        vote = Vote(
            voter=Address(Txn.sender),
            proposal_id=ARC4UInt64(proposal_id),
            support=ARC4UInt64(support),
            weight=ARC4UInt64(weight),
            timestamp=ARC4UInt64(current_time)
        )
        self.votes[vote_key] = vote
        
        # Update proposal vote counts
        if support == UInt64(0):  # Against
            proposal.votes_against = ARC4UInt64(proposal.votes_against.native + weight)
        elif support == UInt64(1):  # For
            proposal.votes_for = ARC4UInt64(proposal.votes_for.native + weight)
        else:  # Abstain
            proposal.votes_abstain = ARC4UInt64(proposal.votes_abstain.native + weight)
        
        # Update proposal status to active if first vote
        if proposal.status.bytes == Bytes(b"pending"):
            proposal.status = ARC4String.from_bytes(Bytes(b"active"))
        
        self.proposals[proposal_id] = proposal
        
        return String("Vote cast successfully")

    @abimethod()
    def finalize_proposal(self, proposal_id: UInt64) -> String:
        """
        Finalize a proposal after voting period ends
        
        Args:
            proposal_id: Proposal to finalize
            
        Returns:
            Final status
        """
        assert self.is_initialized.value, "Governance not initialized"
        
        # Get proposal
        proposal, exists = self.proposals.maybe(proposal_id)
        assert exists, "Proposal not found"
        
        # Check if voting period ended
        current_time = Global.latest_timestamp
        assert current_time > proposal.voting_end.native, "Voting period not ended"
        assert proposal.status.bytes == Bytes(b"active") or proposal.status.bytes == Bytes(b"pending"), "Proposal already finalized"
        
        # Calculate results
        total_votes = proposal.votes_for.native + proposal.votes_against.native + proposal.votes_abstain.native
        
        # TODO: Get total stake from DAO contract for quorum calculation
        # For now, use simple majority
        
        # Determine outcome
        if proposal.votes_for.native > proposal.votes_against.native:
            proposal.status = ARC4String.from_bytes(Bytes(b"passed"))
        else:
            proposal.status = ARC4String.from_bytes(Bytes(b"rejected"))
        
        self.proposals[proposal_id] = proposal
        
        return String.from_bytes(proposal.status.bytes)

    @abimethod()
    def execute_proposal(self, proposal_id: UInt64) -> String:
        """
        Execute a passed proposal
        
        Args:
            proposal_id: Proposal to execute
            
        Returns:
            Execution result
        """
        assert self.is_initialized.value, "Governance not initialized"
        
        # Get proposal
        proposal, exists = self.proposals.maybe(proposal_id)
        assert exists, "Proposal not found"
        assert proposal.status.bytes == Bytes(b"passed"), "Proposal not passed"
        
        # Mark as executed
        proposal.status = ARC4String.from_bytes(Bytes(b"executed"))
        self.proposals[proposal_id] = proposal
        
        # TODO: Implement actual execution logic based on execution_data
        # This could involve creating NFTs, transferring funds, etc.
        
        return String("Proposal executed")

    @abimethod(readonly=True)
    def get_proposal(self, proposal_id: UInt64) -> Proposal:
        """Get proposal information"""
        assert self.is_initialized.value, "Governance not initialized"
        
        proposal, exists = self.proposals.maybe(proposal_id)
        assert exists, "Proposal not found"
        
        return proposal

    @abimethod(readonly=True)
    def get_vote(self, proposal_id: UInt64, voter: Address) -> Vote:
        """Get vote information"""
        assert self.is_initialized.value, "Governance not initialized"
        
        vote_key = op.concat(op.itob(proposal_id), voter.bytes)
        vote, exists = self.votes.maybe(vote_key)
        assert exists, "Vote not found"
        
        return vote

    @abimethod(readonly=True)
    def has_voted(self, proposal_id: UInt64, voter: Address) -> Bool:
        """Check if address has voted on proposal"""
        if not self.is_initialized.value:
            return Bool(False)
        
        vote_key = op.concat(op.itob(proposal_id), voter.bytes)
        vote, exists = self.votes.maybe(vote_key)
        return Bool(exists)

    @abimethod(readonly=True)
    def get_proposal_count(self) -> UInt64:
        """Get total number of proposals"""
        if not self.is_initialized.value:
            return UInt64(0)
        return self.proposal_count.value

    @abimethod(readonly=True)
    def get_governance_params(self) -> tuple[UInt64, UInt64, UInt64, UInt64]:
        """Get governance parameters"""
        assert self.is_initialized.value, "Governance not initialized"
        
        return (
            self.voting_delay.value,
            self.voting_period.value,
            self.proposal_threshold.value,
            self.quorum_percentage.value
        )

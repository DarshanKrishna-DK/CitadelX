# CitadelX DAO Features Documentation

## Overview
This document describes the current DAO features and smart contract architecture before rebuilding the system from scratch.

## Current DAO Architecture

### Smart Contract Structure (`CitadelDAO`)

#### Core Data Structures

1. **DAOConfig Struct**
   ```python
   class DAOConfig(Struct):
       min_members: ARC4UInt64        # Minimum members required
       min_stake: ARC4UInt64          # Minimum stake per member (microAlgos)
       voting_period: ARC4UInt64      # Voting period in seconds
       activation_threshold: ARC4UInt64 # Percentage needed to pass (51-100)
       creator: Address               # DAO creator address
   ```

2. **ProposalData Struct**
   ```python
   class ProposalData(Struct):
       dao_id: ARC4String            # Associated DAO ID
       title: ARC4String             # Proposal title
       description: ARC4String       # Proposal description
       creator: Address              # Proposal creator
       required_votes: ARC4UInt64    # Votes needed to pass
       current_votes: ARC4UInt64     # Current yes votes
       status: ARC4String            # "active", "passed", "rejected", "executed"
       created_at: ARC4UInt64        # Creation timestamp
   ```

#### Storage Maps

1. **dao_configs**: `BoxMap(Bytes, DAOConfig)` - DAO configurations by ID
2. **proposals**: `BoxMap(Bytes, ProposalData)` - Proposal data by ID
3. **member_stakes**: `BoxMap(Bytes, UInt64)` - Member stakes (dao_id + address -> amount)
4. **votes**: `BoxMap(Bytes, UInt64)` - Vote tracking (proposal_id + address -> vote)
5. **treasury_balances**: `BoxMap(Bytes, UInt64)` - DAO treasury balances

#### Core Methods

1. **create_dao_proposal()** - Creates new DAO with initial treasury
2. **join_dao()** - Join existing DAO with stake payment
3. **create_proposal()** - Create governance proposal
4. **vote_on_proposal()** - Cast vote on proposal
5. **execute_proposal()** - Execute passed proposal and mint NFT
6. **distribute_revenue()** - Distribute revenue among members

### Frontend Features

#### DAO Creation Flow
1. **Basic Information**
   - DAO name and description
   - AI moderator category selection
   - Context document upload (IPFS)

2. **Governance Parameters**
   - Minimum members (currently 3, needs to be 1 for testing)
   - Minimum stake amount (ALGO)
   - Voting period (days)
   - Activation threshold (percentage)
   - Treasury contribution

3. **Transaction Processing**
   - Payment transaction creation
   - Smart contract interaction
   - Database record creation

#### Key Components
- **CreateDAOProposal.tsx** - Main DAO creation interface
- **DAODetail.tsx** - Individual DAO management
- **ActiveDAOs.tsx** - List of active DAOs
- **Voting system** - Proposal voting interface

### Current Issues Identified

1. **Address Handling Error**: "Address must not be null or undefined"
   - Occurs in `makePaymentTxnWithSuggestedParamsFromObject`
   - Related to transaction creation parameters

2. **Minimum Members Constraint**: Currently set to 3, needs to be 1 for testing

3. **Complex Transaction Logic**: Multiple transaction types in single flow

4. **Error Handling**: Insufficient error handling for edge cases

## Required Smart Contracts for Rebuild

### 1. **Core DAO Contract**
- DAO creation and management
- Member management with stake tracking
- Treasury management
- Governance parameter configuration

### 2. **Governance Contract** 
- Proposal creation and management
- Voting mechanisms (simple majority, quorum)
- Proposal execution
- Vote delegation (future)

### 3. **Treasury Contract**
- Fund management and distribution
- Revenue sharing among members
- Payment processing
- Emergency functions

### 4. **NFT/Asset Contract**
- AI Moderator NFT creation
- Metadata management
- Ownership tracking
- Transfer mechanisms

## DAO Workflow (End-to-End)

### Phase 1: DAO Creation
1. **Setup**: User connects wallet, provides basic info
2. **Configuration**: Set governance parameters (min members: 1)
3. **Payment**: Initial treasury contribution
4. **Deployment**: Create DAO on-chain
5. **Registration**: Store metadata in database

### Phase 2: Membership Management
1. **Discovery**: Browse available DAOs
2. **Join Process**: Pay minimum stake to join
3. **Stake Management**: Track member contributions
4. **Permissions**: Member-only actions

### Phase 3: Governance
1. **Proposal Creation**: Members create proposals
2. **Voting Period**: Time-bound voting process
3. **Vote Counting**: Automatic tally and threshold check
4. **Execution**: Execute passed proposals

### Phase 4: AI Moderator Creation
1. **Proposal Execution**: Create NFT for AI moderator
2. **Training Data**: Use uploaded context documents
3. **Deployment**: Deploy AI moderator service
4. **Marketplace**: List for sale/subscription

### Phase 5: Revenue Distribution
1. **Revenue Collection**: From AI moderator usage
2. **Distribution Logic**: Proportional to stake
3. **Automatic Payments**: Smart contract distribution
4. **Reporting**: Transaction history and analytics

## Technical Requirements for Rebuild

### Smart Contract Features
- **Modular Design**: Separate contracts for different concerns
- **Upgradeable**: Proxy pattern for future updates
- **Gas Optimized**: Efficient storage and computation
- **Security**: Reentrancy protection, access controls
- **Testing**: Comprehensive test coverage

### Frontend Integration
- **Type Safety**: Generated TypeScript clients
- **Error Handling**: User-friendly error messages
- **State Management**: Consistent state across components
- **Transaction Flow**: Clear multi-step processes
- **Real-time Updates**: Live data synchronization

### Database Schema
- **DAOs**: Core DAO information and metadata
- **Members**: Membership tracking and roles
- **Proposals**: Proposal details and voting history
- **Transactions**: On-chain transaction records
- **AI Moderators**: Moderator metadata and performance

## Success Criteria for Rebuild

1. **Functional**: All core DAO operations work end-to-end
2. **Testable**: Minimum member count of 1 for easy testing
3. **Robust**: Comprehensive error handling and recovery
4. **Scalable**: Modular architecture for future features
5. **User-Friendly**: Clear interfaces and feedback
6. **Secure**: Proper validation and access controls

## Migration Strategy

1. **Backup**: Document current state and data
2. **Clean Slate**: Delete existing DAO files
3. **Rebuild**: Implement new architecture from scratch
4. **Testing**: Comprehensive testing with single member
5. **Integration**: Connect all components
6. **Deployment**: Deploy to testnet for validation

This documentation serves as the blueprint for rebuilding the DAO system with improved architecture, better error handling, and enhanced user experience.

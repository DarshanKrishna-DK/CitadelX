# CitadelX DAO Testing Guide

## Overview
This guide provides step-by-step instructions for testing the rebuilt DAO system with minimum member count of 1.

## Prerequisites

### 1. Environment Setup
- Node.js v18+ installed
- TestNet ALGO in your wallet (get from [Algorand TestNet Dispenser](https://testnet.algoexplorer.io/dispenser))
- Supported wallet (Pera, Defly, or Exodus) connected to TestNet

### 2. Project Setup
```bash
# Install dependencies
cd CitadelX/projects/CitadelX-frontend
npm install

# Start development server
npm run dev
```

## Testing Workflow

### Phase 1: Wallet Connection Testing

1. **Open Application**
   - Navigate to `http://localhost:5173`
   - Verify landing page loads correctly

2. **Connect Wallet**
   - Click "Connect Wallet"
   - Select your preferred wallet (Pera recommended)
   - Approve connection in wallet app
   - Verify address appears in navigation

3. **Validate Connection**
   - Check browser console for validation logs
   - Ensure no "Wallet address not found" errors
   - Verify user context loads properly

### Phase 2: DAO Creation Testing

1. **Navigate to DAO Creation**
   - Click "Create DAO" or go to `/dao/create`
   - Verify stepper interface loads

2. **Step 1: Basic Information**
   - Enter DAO name (e.g., "Test DAO 1")
   - Add description (e.g., "Testing DAO with single member")
   - Select AI moderator category
   - Optionally upload context documents
   - Click "Next"

3. **Step 2: Governance Settings**
   - Set minimum stake: 0.5 ALGO
   - Set voting period: 1 day (minimum for testing)
   - Set quorum threshold: 51%
   - Note: Minimum members is automatically set to 1
   - Click "Next"

4. **Step 3: Initial Stake**
   - Set your initial stake: 1.0 ALGO (or more)
   - Verify amount meets minimum requirement
   - Click "Next"

5. **Step 4: Review & Create**
   - Review all settings
   - Click "Create DAO"
   - Approve transaction in wallet
   - Wait for confirmation

6. **Verify Creation**
   - Check for success message
   - Note transaction ID
   - Verify redirect to DAO detail page

### Phase 3: DAO Management Testing

1. **DAO Detail Page**
   - Verify DAO information displays correctly
   - Check member count shows 1 (you)
   - Verify treasury balance matches your stake
   - Confirm you're marked as creator

2. **Member Management**
   - Go to "Members" tab
   - Verify you appear as the only member
   - Check stake amount is correct
   - Verify "Creator" badge appears

3. **Test Additional Membership** (Optional)
   - Use second wallet/account
   - Navigate to your DAO detail page
   - Click "Join DAO"
   - Set stake amount (minimum required)
   - Complete join transaction
   - Verify member count increases

### Phase 4: Governance Testing

1. **Create Proposal**
   - Go to "Proposals" tab in DAO detail
   - Click "Create Proposal"
   - Enter title: "Test Proposal 1"
   - Enter description: "Testing proposal creation and voting"
   - Submit proposal
   - Verify proposal appears in list

2. **Vote on Proposal**
   - Find your created proposal
   - Click "Vote For" or "Vote Against"
   - Verify vote is recorded
   - Check vote counts update

3. **Test Proposal Lifecycle**
   - Create multiple proposals
   - Vote on different proposals
   - Verify status changes (active → passed/rejected)

### Phase 5: Treasury Testing

1. **Check Treasury Balance**
   - Verify treasury shows correct total stake
   - Check individual member contributions
   - Verify balance updates with new members

2. **Test Stake Increase** (If implemented)
   - Increase your stake in the DAO
   - Verify treasury balance updates
   - Check voting weight changes

### Phase 6: Error Handling Testing

1. **Invalid Transactions**
   - Try creating DAO with insufficient funds
   - Attempt to join with below minimum stake
   - Test with disconnected wallet

2. **Edge Cases**
   - Try creating DAO with empty fields
   - Test very long names/descriptions
   - Attempt duplicate votes on same proposal

3. **Network Issues**
   - Test with poor internet connection
   - Verify error messages are user-friendly
   - Check recovery mechanisms work

## Expected Results

### ✅ Success Criteria

1. **Wallet Connection**
   - ✅ Connects without "address not found" errors
   - ✅ Address validation passes
   - ✅ User context creates automatically

2. **DAO Creation**
   - ✅ Creates DAO with single member (minimum = 1)
   - ✅ Transaction completes successfully
   - ✅ Database records created correctly
   - ✅ Treasury initialized with creator's stake

3. **DAO Management**
   - ✅ Member list shows creator
   - ✅ Treasury balance accurate
   - ✅ Additional members can join
   - ✅ Statistics update correctly

4. **Governance**
   - ✅ Proposals can be created by members
   - ✅ Voting works correctly
   - ✅ Vote weights based on stake
   - ✅ Proposal status updates properly

5. **Error Handling**
   - ✅ Clear error messages
   - ✅ Graceful failure handling
   - ✅ Recovery mechanisms work

## Troubleshooting

### Common Issues

1. **"Transaction failed"**
   - Check TestNet ALGO balance
   - Verify wallet is on TestNet
   - Ensure sufficient funds for transaction + fees

2. **"User not found"**
   - Should auto-resolve with new user creation
   - Check browser console for details
   - Verify wallet connection is stable

3. **"DAO creation failed"**
   - Check all required fields are filled
   - Verify minimum stake requirements
   - Check network connectivity

4. **"Proposal creation failed"**
   - Ensure you're a DAO member
   - Check title and description are not empty
   - Verify DAO is active

### Debug Information

Check browser console for:
- Wallet connection logs
- Transaction details
- Error messages with stack traces
- Network request/response data

### Database Verification

Check Supabase tables:
- `daos` - DAO records
- `dao_members` - Member records
- `dao_proposals` - Proposal records
- `dao_votes` - Vote records
- `users` - User records

## Performance Benchmarks

### Target Performance
- DAO creation: < 30 seconds
- Wallet connection: < 5 seconds
- Page load times: < 3 seconds
- Transaction confirmation: < 10 seconds

### Monitoring
- Check browser network tab for slow requests
- Monitor wallet response times
- Track transaction confirmation times
- Measure user interaction responsiveness

## Test Data Examples

### Sample DAO Configurations

1. **Gaming DAO**
   - Name: "Gaming Moderators DAO"
   - Category: Gaming
   - Min Stake: 0.5 ALGO
   - Voting Period: 3 days
   - Quorum: 51%

2. **Educational DAO**
   - Name: "EduTech Moderators"
   - Category: Educational
   - Min Stake: 1.0 ALGO
   - Voting Period: 7 days
   - Quorum: 60%

3. **Business DAO**
   - Name: "Professional Chat Moderators"
   - Category: Business
   - Min Stake: 2.0 ALGO
   - Voting Period: 5 days
   - Quorum: 75%

## Reporting Issues

When reporting issues, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Browser console logs
4. Transaction IDs (if applicable)
5. Wallet type and version
6. Network conditions

## Next Steps After Testing

1. **Smart Contract Deployment**
   - Deploy contracts to TestNet
   - Update frontend to use contract addresses
   - Test with actual smart contract interactions

2. **Advanced Features**
   - Implement NFT creation for AI moderators
   - Add revenue distribution mechanisms
   - Create marketplace functionality

3. **Production Preparation**
   - Increase minimum member count
   - Add additional security measures
   - Implement comprehensive monitoring

This testing guide ensures the rebuilt DAO system works correctly with the minimum member count of 1, resolving the original "Wallet address not found" error while providing a robust foundation for future development.

# CitadelX Platform Setup Guide

## Overview
CitadelX is a decentralized AI moderation platform built on Algorand blockchain. This guide will help you set up the complete system including frontend, smart contracts, and database.

## Prerequisites
- Node.js >= 20.0
- Python >= 3.12
- Docker (for AlgoKit LocalNet)
- Supabase account
- Google Cloud account (for YouTube OAuth)

## 1. Supabase Database Setup

### Create Supabase Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  youtube_channel_id TEXT,
  youtube_channel_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DAOs table
CREATE TABLE daos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  creator_id UUID REFERENCES users(id),
  member_count INTEGER DEFAULT 1,
  treasury_balance NUMERIC DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'active', 'inactive')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DAO Members table
CREATE TABLE dao_members (
  dao_id UUID REFERENCES daos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  voting_power INTEGER DEFAULT 100,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (dao_id, user_id)
);

-- Proposals table
CREATE TABLE proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dao_id UUID REFERENCES daos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  criteria JSONB,
  required_votes INTEGER NOT NULL,
  current_votes INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'active', 'passed', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposal Votes table
CREATE TABLE proposal_votes (
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  vote_weight INTEGER NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('yes', 'no', 'abstain')) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (proposal_id, user_id)
);

-- AI Moderators table
CREATE TABLE ai_moderators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dao_id UUID REFERENCES daos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  context_documents TEXT[],
  nft_asset_id BIGINT,
  nft_metadata_url TEXT,
  price_model TEXT[] NOT NULL,
  monthly_price NUMERIC,
  pay_per_use_price NUMERIC,
  outright_price NUMERIC,
  status TEXT CHECK (status IN ('training', 'active', 'inactive')) DEFAULT 'training',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderator Purchases table
CREATE TABLE moderator_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  moderator_id UUID REFERENCES ai_moderators(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  purchase_type TEXT CHECK (purchase_type IN ('monthly', 'pay_per_use', 'outright')) NOT NULL,
  amount_paid NUMERIC NOT NULL,
  transaction_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DAO Revenue table
CREATE TABLE dao_revenue (
  dao_id UUID REFERENCES daos(id) ON DELETE CASCADE PRIMARY KEY,
  total_revenue NUMERIC DEFAULT 0,
  last_distribution TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_daos_status ON daos(status);
CREATE INDEX idx_dao_members_user ON dao_members(user_id);
CREATE INDEX idx_proposals_dao ON proposals(dao_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_moderators_dao ON ai_moderators(dao_id);
CREATE INDEX idx_moderators_status ON ai_moderators(status);
CREATE INDEX idx_purchases_user ON moderator_purchases(user_id);
CREATE INDEX idx_purchases_moderator ON moderator_purchases(moderator_id);
```

### Row Level Security (RLS) Policies

Enable RLS and create policies:

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dao_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderator_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE dao_revenue ENABLE ROW LEVEL SECURITY;

-- Users: Anyone can read, users can update their own record
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (true);
CREATE POLICY "Users can insert own record" ON users FOR INSERT WITH CHECK (true);

-- DAOs: Anyone can read, authenticated users can create
CREATE POLICY "DAOs are viewable by everyone" ON daos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create DAOs" ON daos FOR INSERT WITH CHECK (true);
CREATE POLICY "DAO creators can update" ON daos FOR UPDATE USING (true);

-- DAO Members: Anyone can read, users can join
CREATE POLICY "DAO members are viewable by everyone" ON dao_members FOR SELECT USING (true);
CREATE POLICY "Users can join DAOs" ON dao_members FOR INSERT WITH CHECK (true);

-- Proposals: Anyone can read, DAO members can create
CREATE POLICY "Proposals are viewable by everyone" ON proposals FOR SELECT USING (true);
CREATE POLICY "DAO members can create proposals" ON proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Proposals can be updated" ON proposals FOR UPDATE USING (true);

-- Proposal Votes: Anyone can read, users can vote
CREATE POLICY "Votes are viewable by everyone" ON proposal_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON proposal_votes FOR INSERT WITH CHECK (true);

-- AI Moderators: Anyone can read, DAOs can create
CREATE POLICY "Moderators are viewable by everyone" ON ai_moderators FOR SELECT USING (true);
CREATE POLICY "DAOs can create moderators" ON ai_moderators FOR INSERT WITH CHECK (true);
CREATE POLICY "Moderators can be updated" ON ai_moderators FOR UPDATE USING (true);

-- Moderator Purchases: Users can view their purchases, anyone can purchase
CREATE POLICY "Users can view purchases" ON moderator_purchases FOR SELECT USING (true);
CREATE POLICY "Users can purchase moderators" ON moderator_purchases FOR INSERT WITH CHECK (true);

-- DAO Revenue: Anyone can read
CREATE POLICY "Revenue is viewable by everyone" ON dao_revenue FOR SELECT USING (true);
CREATE POLICY "Revenue can be inserted" ON dao_revenue FOR INSERT WITH CHECK (true);
CREATE POLICY "Revenue can be updated" ON dao_revenue FOR UPDATE USING (true);
```

## 2. Environment Variables Setup

### Frontend Environment (.env)

Create a `.env` file in `CitadelX/projects/CitadelX-frontend/`:

```env
# Algorand Network Configuration
VITE_ALGOD_NETWORK=localnet
VITE_ALGOD_SERVER=http://localhost
VITE_ALGOD_PORT=4001
VITE_ALGOD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
VITE_KMD_SERVER=http://localhost
VITE_KMD_PORT=4002
VITE_KMD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# YouTube OAuth Configuration
VITE_YOUTUBE_CLIENT_ID=your_google_oauth_client_id
VITE_YOUTUBE_CLIENT_SECRET=your_google_oauth_client_secret
VITE_YOUTUBE_REDIRECT_URI=http://localhost:5173/auth/callback
```

## 3. Google Cloud Setup (YouTube OAuth)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5173/auth/callback`
5. Copy Client ID and Client Secret to your `.env` file

## 4. Installation Steps

### Backend (Smart Contracts)

```bash
cd CitadelX/projects/CitadelX-contracts
algokit project bootstrap all
algokit project run build
```

### Frontend

```bash
cd CitadelX/projects/CitadelX-frontend
npm install
npm run dev
```

## 5. Running the Application

1. **Start AlgoKit LocalNet:**
```bash
algokit localnet start
```

2. **Start Frontend:**
```bash
cd CitadelX/projects/CitadelX-frontend
npm run dev
```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - AlgoKit LocalNet Explorer: http://localhost:8080

## 6. Smart Contract Deployment

The smart contracts will be automatically compiled when you run the build command. To deploy:

```bash
cd CitadelX/projects/CitadelX-contracts
algokit project deploy localnet
```

## 7. Key Features

### Frontend Pages
- **Landing Page** (`/`): Marketing page with signup/login
- **Dashboard** (`/dashboard`): User dashboard with stats, DAOs, and moderators
- **Marketplace** (`/marketplace`): Browse and purchase AI moderators
- **Create DAO** (`/dao/create`): Form a new DAO with proposals
- **DAO Detail** (`/dao/:id`): View DAO details, proposals, and vote
- **Moderator Detail** (`/moderator/:id`): View moderator details and purchase
- **Profile** (`/profile`): User profile with DAOs and purchases

### Smart Contracts
- **CitadelDAO**: Manages DAO creation, membership, proposals, voting, and revenue distribution
- **ModeratorNFT**: Manages NFT creation (ASA) for AI moderators with metadata

### Database Structure
- **users**: User accounts linked to wallet addresses
- **daos**: DAO organizations
- **dao_members**: DAO membership tracking
- **proposals**: DAO proposals for voting
- **proposal_votes**: Individual votes on proposals
- **ai_moderators**: AI moderator configurations with NFT data
- **moderator_purchases**: Purchase history
- **dao_revenue**: Revenue tracking and distribution

## 8. Development Workflow

1. **Create a DAO**: Use the "Create DAO" page to propose a new DAO
2. **Vote on Proposals**: Members vote on proposals to activate the DAO
3. **Mint NFT**: When proposal passes, NFT is minted for the AI moderator
4. **List in Marketplace**: Active moderators appear in the marketplace
5. **Purchase/Subscribe**: Users can purchase or subscribe to moderators
6. **Revenue Distribution**: Revenue is distributed among DAO members

## 9. Testing

### Test User Flow:
1. Connect wallet on landing page
2. Create a DAO with context documents
3. Join DAOs as different users
4. Vote on proposals
5. Browse marketplace
6. Purchase a moderator
7. View profile and earnings

## 10. Troubleshooting

### Common Issues:

**Wallet not connecting:**
- Ensure AlgoKit LocalNet is running
- Check that wallet credentials are correct

**Supabase errors:**
- Verify environment variables are set correctly
- Check RLS policies are enabled
- Ensure tables are created

**Smart contract build errors:**
- Run `algokit project bootstrap all` again
- Check Python version >= 3.12

## 11. Production Deployment

### Frontend:
```bash
npm run build
# Deploy to Vercel, Netlify, or your hosting service
```

### Smart Contracts:
```bash
# For TestNet
algokit project deploy testnet

# For MainNet
algokit project deploy mainnet
```

### Update Environment Variables:
- Change `VITE_ALGOD_NETWORK` to `testnet` or `mainnet`
- Update Algorand node URLs and tokens
- Configure production Supabase instance
- Set production YouTube OAuth redirect URI

## 12. Next Steps

- Implement IPFS integration for context documents and NFT metadata
- Add real Algorand payment transactions for purchases
- Implement actual AI moderation backend service
- Add YouTube live chat integration
- Enhance revenue distribution with smart contracts
- Add governance token (ASA) for voting power
- Implement reputation system
- Add analytics dashboard

## Support

For issues or questions:
- Check the AlgoKit documentation: https://github.com/algorandfoundation/algokit-cli
- Supabase docs: https://supabase.com/docs
- Algorand developer portal: https://developer.algorand.org/





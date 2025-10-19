# CitadelX Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will get you up and running with CitadelX quickly.

## Step 1: Prerequisites Check

Make sure you have:
- ✅ Node.js >= 20.0 installed
- ✅ Python >= 3.12 installed
- ✅ Docker installed and running
- ✅ AlgoKit installed (`pip install algokit`)

## Step 2: Start AlgoKit LocalNet

```bash
# From the CitadelX root directory
algokit localnet start
```

This starts the local Algorand blockchain for development.

## Step 3: Bootstrap the Project

```bash
# From the CitadelX root directory
algokit project bootstrap all
```

This installs all dependencies for both frontend and smart contracts.

## Step 4: Setup Supabase Database

### Option A: Use Existing Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a project
2. Copy the SQL from `CITADELX_SETUP.md` (Section 1)
3. Run it in your Supabase SQL Editor
4. Copy your Project URL and Anon Key

### Option B: Skip for Now (UI Testing Only)
The UI will work without Supabase, but data won't persist.

## Step 5: Configure Environment

Create `.env` file in `projects/CitadelX-frontend/`:

```env
# Algorand (Default LocalNet values - these work out of the box)
VITE_ALGOD_NETWORK=localnet
VITE_ALGOD_SERVER=http://localhost
VITE_ALGOD_PORT=4001
VITE_ALGOD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

# Supabase (Add your values)
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# YouTube (Optional - can skip for now)
VITE_YOUTUBE_CLIENT_ID=your_client_id
VITE_YOUTUBE_CLIENT_SECRET=your_client_secret
VITE_YOUTUBE_REDIRECT_URI=http://localhost:5173/auth/callback
```

## Step 6: Build Smart Contracts (Optional)

```bash
cd projects/CitadelX-contracts
algokit project run build
```

This compiles the Algorand smart contracts. Not required for UI testing.

## Step 7: Start the Frontend

```bash
cd projects/CitadelX-frontend
npm run dev
```

## Step 8: Open Your Browser

Navigate to: **http://localhost:5173**

You should see the CitadelX landing page! 🎉

## What Can You Do Now?

### Without Supabase (UI Testing)
- ✅ View landing page
- ✅ Connect wallet (using LocalNet wallet)
- ✅ Navigate through all pages
- ❌ Data won't persist

### With Supabase (Full Functionality)
- ✅ Create user account
- ✅ Create DAOs
- ✅ Join DAOs
- ✅ Vote on proposals
- ✅ Browse marketplace
- ✅ Purchase moderators
- ✅ View profile and earnings

## Quick Test Flow

1. **Connect Wallet**: Click "Login" and select "LocalNet Wallet"
2. **Create DAO**: Navigate to "Create DAO" and fill out the form
3. **View Dashboard**: See your new DAO on the dashboard
4. **Browse Marketplace**: Check out the marketplace (will be empty initially)
5. **View Profile**: Check your profile with DAO memberships

## Common Issues

### "Cannot connect wallet"
- Make sure AlgoKit LocalNet is running: `algokit localnet status`
- Restart if needed: `algokit localnet reset`

### "Supabase errors"
- Check your `.env` file has correct credentials
- Verify you ran the SQL setup in Supabase
- Check Supabase project is active

### "Module not found errors"
- Run `npm install` in the frontend directory
- Clear cache: `npm run build` then `npm run dev`

## Development Tips

### Hot Reload
The frontend has hot reload - your changes appear instantly!

### Debugging
- Open browser DevTools (F12)
- Check Console for errors
- Network tab shows Supabase queries

### Wallet Accounts
LocalNet wallet has pre-funded accounts. Use different accounts to test:
- Creating DAOs
- Joining DAOs
- Voting on proposals

## Next Steps

1. **Read Full Documentation**: See `CITADELX_SETUP.md` for detailed setup
2. **Explore Features**: Try creating DAOs, voting, browsing marketplace
3. **Customize**: Modify the theme, add features, enhance UI
4. **Deploy**: Follow production deployment guide when ready

## Need Help?

- 📖 Full Setup: `CITADELX_SETUP.md`
- 📋 Implementation Details: `IMPLEMENTATION_SUMMARY.md`
- 🔧 AlgoKit Docs: https://github.com/algorandfoundation/algokit-cli
- 💾 Supabase Docs: https://supabase.com/docs

## Quick Commands Reference

```bash
# Start LocalNet
algokit localnet start

# Stop LocalNet
algokit localnet stop

# Reset LocalNet (fresh blockchain)
algokit localnet reset

# Install dependencies
npm install                    # Frontend
algokit project bootstrap all  # Everything

# Run development server
npm run dev                    # Frontend

# Build for production
npm run build                  # Frontend
algokit project run build      # Smart contracts

# Check status
algokit localnet status        # Blockchain status
```

---

**You're ready to build on CitadelX!** 🚀

Start with connecting your wallet and exploring the UI. When you're ready for full functionality, set up Supabase following the detailed guide.

Happy building! 🎉





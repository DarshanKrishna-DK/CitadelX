# CitadelX

**Decentralized AI Moderation for the Creator Economy**

CitadelX transforms AI chat moderation from a costly expense into a thriving economic primitive. Built on Algorand blockchain, CitadelX enables creators to form DAOs, train AI moderators, and monetize them through a decentralized marketplace.

## Overview

The creator economy faces bottlenecks from expensive and unscalable human chat moderation, leading to toxic communities and lost revenue. CitadelX solves this by:

- **DAO Governance**: Creators form DAOs to collectively build and govern AI moderators
- **AI Moderator Marketplace**: Buy, sell, or subscribe to contextual AI moderators  
- **Multiple Revenue Models**: Monthly subscriptions, pay-per-use, or outright purchases
- **NFT-Based Ownership**: Each AI moderator is represented by an Algorand ASA (NFT)
- **YouTube Integration**: Seamlessly connect channels for live chat moderation
- **Revenue Sharing**: Automatic distribution of earnings among DAO members
- **Enhanced Wallet Connection**: Robust wallet integration with comprehensive error handling

## Project Structure

This is a full-stack AlgoKit project with:
- **Smart Contracts** (Algorand Python): DAO governance and NFT management
- **Frontend** (React + TypeScript + MUI): Complete user interface
- **Database** (Supabase): Dynamic data storage and user management

## Setup

### Quick Start (TestNet)
For running on Algorand TestNet with enhanced wallet connection:
1. See [TESTNET_SETUP.md](./TESTNET_SETUP.md) for detailed TestNet setup instructions
2. The project now includes improved wallet connection handling and error resolution

### Initial setup
1. Clone this repository to your local machine.
2. Ensure [Docker](https://www.docker.com/) is installed and operational. Then, install `AlgoKit` following this [guide](https://github.com/algorandfoundation/algokit-cli#install).
3. Run `algokit project bootstrap all` in the project directory. This command sets up your environment by installing necessary dependencies, setting up a Python virtual environment, and preparing your `.env` file.
4. In the case of a smart contract project, execute `algokit generate env-file -a target_network localnet` from the `CitadelX-contracts` directory to create a `.env.localnet` file with default configuration for `localnet`.
5. To build your project, execute `algokit project run build`. This compiles your project and prepares it for running.
6. For project-specific instructions, refer to the READMEs of the child projects:
   - Smart Contracts: [CitadelX-contracts](projects/CitadelX-contracts/README.md)
   - Frontend Application: [CitadelX-frontend](projects/CitadelX-frontend/README.md)

> This project is structured as a monorepo, refer to the [documentation](https://github.com/algorandfoundation/algokit-cli/blob/main/docs/features/project/run.md) to learn more about custom command orchestration via `algokit project run`.

### Subsequently

1. If you update to the latest source code and there are new dependencies, you will need to run `algokit project bootstrap all` again.
2. Follow step 3 above.

## Tech Stack

### Blockchain
- **Algorand**: Layer 1 blockchain for fast, secure, and scalable transactions
- **AlgoKit**: Development framework for Algorand smart contracts
- **Algorand Python**: Modern typed Python for smart contract development

### Frontend
- **React 18** + **TypeScript**: Modern UI framework
- **Material-UI (MUI)**: Orange/black themed component library
- **React Router**: Client-side routing
- **@txnlab/use-wallet-react**: Wallet integration (Pera, Defly, Exodus)
- **Vite**: Fast build tool

### Backend & Database
- **Supabase**: PostgreSQL database with real-time subscriptions
- **YouTube Data API v3**: Channel connection and OAuth

### Smart Contracts
- **CitadelDAO**: DAO creation, membership, proposals, voting, and revenue distribution
- **ModeratorNFT**: NFT (ASA) minting for AI moderators with IPFS metadata

## Quick Start

For detailed setup instructions, see [CITADELX_SETUP.md](CITADELX_SETUP.md)

```bash
# 1. Start AlgoKit LocalNet
algokit localnet start

# 2. Install dependencies
algokit project bootstrap all

# 3. Build smart contracts
algokit project run build

# 4. Configure environment variables
# Create .env file in CitadelX-frontend with Supabase and YouTube credentials

# 5. Start frontend
cd projects/CitadelX-frontend
npm run dev
```

Visit http://localhost:5173 to access the application.


## Integrating with smart contracts and application clients

Refer to the [CitadelX-contracts](projects/CitadelX-contracts/README.md) folder for overview of working with smart contracts, [projects/CitadelX-frontend](projects/CitadelX-frontend/README.md) for overview of the React project and the [projects/CitadelX-frontend/contracts](projects/CitadelX-frontend/src/contracts/README.md) folder for README on adding new smart contracts from backend as application clients on your frontend. The templates provided in these folders will help you get started.
When you compile and generate smart contract artifacts, your frontend component will automatically generate typescript application clients from smart contract artifacts and move them to `frontend/src/contracts` folder, see [`generate:app-clients` in package.json](projects/CitadelX-frontend/package.json). Afterwards, you are free to import and use them in your frontend application.

The frontend starter also provides an example of interactions with your HelloWorldClient in [`AppCalls.tsx`](projects/CitadelX-frontend/src/components/AppCalls.tsx) component by default.

## Features

### For Creators
- ✅ Form DAOs with fellow streamers
- ✅ Upload context documents to train AI moderators
- ✅ Vote on DAO proposals with on-chain governance
- ✅ Connect YouTube channels for integration
- ✅ Earn revenue from moderator sales/subscriptions
- ✅ Track earnings and DAO memberships

### For Users
- ✅ Browse AI moderator marketplace
- ✅ Purchase with multiple pricing models:
  - Monthly subscriptions
  - Pay-per-use
  - One-time outright purchase
- ✅ Own moderator NFTs (Algorand ASAs)
- ✅ View purchase history and active moderators

### Platform Features
- ✅ Decentralized DAO governance
- ✅ On-chain voting with smart contracts
- ✅ NFT-based moderator ownership
- ✅ Automatic revenue distribution
- ✅ Real-time data with Supabase
- ✅ Secure wallet authentication
- ✅ Responsive orange/black themed UI

## User Flow

1. **Sign Up**: Connect Algorand wallet and optionally link YouTube channel
2. **Create DAO**: Propose a new DAO with context documents and criteria
3. **Join & Vote**: Other creators join and vote on the proposal
4. **Mint NFT**: When proposal passes, NFT is minted for the AI moderator
5. **List**: Active moderators appear in the marketplace
6. **Purchase**: Users buy or subscribe to moderators
7. **Earn**: Revenue is distributed among DAO members

## Architecture

```
CitadelX/
├── projects/
│   ├── CitadelX-contracts/        # Algorand Smart Contracts
│   │   └── smart_contracts/
│   │       ├── citadel_dao/       # DAO governance contract
│   │       └── moderator_nft/     # NFT minting contract
│   └── CitadelX-frontend/         # React Frontend
│       └── src/
│           ├── pages/             # Route pages
│           ├── components/        # Reusable components
│           ├── contexts/          # React contexts
│           ├── utils/             # Utilities (Supabase, YouTube)
│           └── theme/             # MUI theme
├── CITADELX_SETUP.md             # Detailed setup guide
└── README.md                      # This file
```

## Development

### Smart Contracts
```bash
cd projects/CitadelX-contracts
algokit project run build          # Compile contracts
algokit project deploy localnet    # Deploy to LocalNet
```

### Frontend
```bash
cd projects/CitadelX-frontend
npm run dev                        # Start dev server
npm run build                      # Production build
```

## Contributing

This project uses:
- AlgoKit for Algorand development
- Algorand Python for smart contracts
- React best practices
- TypeScript for type safety
- Material-UI for consistent design

## License

MIT License - see LICENSE file for details

## Support

- AlgoKit Docs: https://github.com/algorandfoundation/algokit-cli
- Algorand Developer Portal: https://developer.algorand.org/
- Supabase Docs: https://supabase.com/docs

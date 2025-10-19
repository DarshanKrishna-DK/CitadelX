# CitadelX Environment Configuration Guide

This guide explains how to set up and configure your environment variables for the CitadelX platform.

## Quick Start

1. **Copy the template file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your credentials** in the `.env` file

3. **Start the application:**
   ```bash
   npm run dev
   ```

## Environment Variables Overview

### 1. Algorand Network Configuration

The most important variable is `VITE_ALGOD_NETWORK` which determines which Algorand network you're using:

| Network | Use Case | Wallets Available |
|---------|----------|-------------------|
| `localnet` | Local development & testing | KMD (local wallet only) |
| `testnet` | Development with real wallets | Pera, Defly, Exodus |
| `mainnet` | Production deployment | Pera, Defly, Exodus |

### 2. Network Configurations

#### LocalNet (Development)
```env
VITE_ALGOD_NETWORK=localnet
VITE_ALGOD_SERVER=http://localhost
VITE_ALGOD_PORT=4001
VITE_ALGOD_TOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

**Setup:**
```bash
algokit localnet start
```

#### TestNet (Recommended for Development)
```env
VITE_ALGOD_NETWORK=testnet
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=
```

**Get free TestNet ALGO:**
- https://bank.testnet.algorand.network/

#### MainNet (Production)
```env
VITE_ALGOD_NETWORK=mainnet
VITE_ALGOD_SERVER=https://mainnet-api.algonode.cloud
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=
```

**⚠️ WARNING:** MainNet uses real ALGO tokens with real value!

## Required Services Setup

### Supabase (Database)

1. **Create a Supabase project:**
   - Go to https://supabase.com
   - Create a new project
   - Wait for setup to complete

2. **Get your credentials:**
   - Navigate to Project Settings → API
   - Copy your project URL and anon key

3. **Add to .env:**
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

### YouTube Integration (Optional)

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com

2. **Create/Select a project**

3. **Enable YouTube Data API v3:**
   - APIs & Services → Enable APIs and Services
   - Search for "YouTube Data API v3"
   - Click Enable

4. **Create OAuth credentials:**
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5173/auth/callback`

5. **Add to .env:**
   ```env
   VITE_YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   VITE_YOUTUBE_CLIENT_SECRET=your_client_secret
   VITE_YOUTUBE_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

## Network Switching Guide

### Switch to LocalNet

1. Edit `.env`:
   ```env
   VITE_ALGOD_NETWORK=localnet
   ```

2. Uncomment LocalNet configuration lines

3. Comment out TestNet/MainNet lines

4. Start LocalNet:
   ```bash
   algokit localnet start
   ```

5. Restart your dev server:
   ```bash
   npm run dev
   ```

**Result:** KMD wallet will appear for local testing

### Switch to TestNet

1. Edit `.env`:
   ```env
   VITE_ALGOD_NETWORK=testnet
   ```

2. Use TestNet configuration (default in template)

3. Restart your dev server

**Result:** Pera, Defly, and Exodus wallets will appear

### Switch to MainNet

1. Edit `.env`:
   ```env
   VITE_ALGOD_NETWORK=mainnet
   ```

2. Uncomment MainNet configuration

3. Comment out TestNet lines

4. Restart your dev server

**Result:** Pera, Defly, and Exodus wallets will appear (uses real ALGO!)

## Wallet Compatibility

| Network | KMD | Pera | Defly | Exodus |
|---------|-----|------|-------|--------|
| LocalNet | ✅ | ❌ | ❌ | ❌ |
| TestNet | ❌ | ✅ | ✅ | ✅ |
| MainNet | ❌ | ✅ | ✅ | ✅ |

## Troubleshooting

### Issue: "KMD wallet appears instead of Pera"

**Solution:** Change `VITE_ALGOD_NETWORK=localnet` to `VITE_ALGOD_NETWORK=testnet` in your `.env` file

### Issue: "Supabase connection error"

**Solution:** 
- Verify your Supabase credentials
- Check that your Supabase project is active
- Ensure you're using the anon key, not the service role key

### Issue: "YouTube OAuth not working"

**Solution:**
- Verify redirect URI matches exactly in Google Cloud Console
- Make sure YouTube Data API v3 is enabled
- Check that OAuth consent screen is configured

## Environment Variables Reference

### Core Variables
- `VITE_ALGOD_NETWORK` - Network selection (localnet/testnet/mainnet)
- `VITE_ALGOD_SERVER` - Algorand node URL
- `VITE_ALGOD_PORT` - Algorand node port
- `VITE_ALGOD_TOKEN` - Algorand node auth token (usually empty for public nodes)

### Indexer Variables (Optional)
- `VITE_INDEXER_SERVER` - Algorand indexer URL
- `VITE_INDEXER_PORT` - Indexer port
- `VITE_INDEXER_TOKEN` - Indexer auth token

### Database Variables
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### YouTube Variables (Optional)
- `VITE_YOUTUBE_CLIENT_ID` - Google OAuth client ID
- `VITE_YOUTUBE_CLIENT_SECRET` - Google OAuth client secret
- `VITE_YOUTUBE_REDIRECT_URI` - OAuth callback URL

### Application Variables
- `VITE_ENVIRONMENT` - Application environment (development/production)

## Security Notes

⚠️ **IMPORTANT:**
- Never commit your `.env` file to version control
- Use `.env.example` as a template for sharing configuration structure
- Keep your Supabase service role key secure (don't use it in frontend)
- Protect your Google OAuth client secret
- Use environment-specific credentials for each deployment

## Getting Help

- **Algorand Documentation:** https://developer.algorand.org
- **Supabase Documentation:** https://supabase.com/docs
- **AlgoKit Documentation:** https://github.com/algorandfoundation/algokit-cli

---

**Need more help?** Check the main project README or open an issue on GitHub.


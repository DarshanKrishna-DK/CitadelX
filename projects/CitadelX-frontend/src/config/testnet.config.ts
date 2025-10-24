// TestNet Configuration for CitadelX
export const testnetConfig = {
  // Algorand TestNet Configuration
  algod: {
    network: 'testnet',
    server: 'https://testnet-api.algonode.cloud',
    port: 443,
    token: '',
  },
  
  // Indexer Configuration
  indexer: {
    server: 'https://testnet-idx.algonode.cloud',
    port: 443,
    token: '',
  },
  
  // Treasury Configuration for TestNet
  treasury: {
    address: 'RLUKWBU2COUQXFBMVR5Z4GRQERL3QDSBSGFECZYDTIUW4DH4LPSGCKDD7I',
  },
  
  // Supported Wallets for TestNet
  wallets: {
    supported: ['PERA', 'DEFLY', 'EXODUS'],
    defaultNetwork: 'testnet',
  }
}

// Environment variable fallbacks
export const getTestnetConfig = () => {
  return {
    algod: {
      network: import.meta.env.VITE_ALGOD_NETWORK || testnetConfig.algod.network,
      server: import.meta.env.VITE_ALGOD_SERVER || testnetConfig.algod.server,
      port: import.meta.env.VITE_ALGOD_PORT || testnetConfig.algod.port,
      token: import.meta.env.VITE_ALGOD_TOKEN || testnetConfig.algod.token,
    },
    indexer: {
      server: import.meta.env.VITE_INDEXER_SERVER || testnetConfig.indexer.server,
      port: import.meta.env.VITE_INDEXER_PORT || testnetConfig.indexer.port,
      token: import.meta.env.VITE_INDEXER_TOKEN || testnetConfig.indexer.token,
    },
    treasury: {
      address: import.meta.env.VITE_TREASURY_ADDRESS || testnetConfig.treasury.address,
    }
  }
}

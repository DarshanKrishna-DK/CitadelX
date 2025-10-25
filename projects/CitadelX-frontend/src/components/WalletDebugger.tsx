import React from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { Box, Typography, Paper, Chip, Button } from '@mui/material'
import { testWalletConnection } from '../utils/testWalletConnection'
import { getTestnetConfig } from '../config/testnet.config'

const WalletDebugger: React.FC = () => {
  const { activeAddress, isReady, wallets } = useWallet()
  const config = getTestnetConfig()
  
  const connectionTest = testWalletConnection(activeAddress, isReady)
  
  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.100' }}>
      <Typography variant="h6" gutterBottom>
        🔍 Wallet Debug Info
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Connection Status:</Typography>
        <Chip 
          label={isReady ? 'Ready' : 'Not Ready'} 
          color={isReady ? 'success' : 'error'} 
          size="small" 
        />
        <Chip 
          label={activeAddress ? 'Connected' : 'Disconnected'} 
          color={activeAddress ? 'success' : 'error'} 
          size="small" 
          sx={{ ml: 1 }}
        />
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Active Address:</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {activeAddress || 'None'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Raw Value: {JSON.stringify(activeAddress)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Length: {activeAddress?.length || 0} | Type: {typeof activeAddress}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Is Null: {activeAddress === null ? 'Yes' : 'No'} | 
          Is Undefined: {activeAddress === undefined ? 'Yes' : 'No'} |
          Is Empty: {activeAddress === '' ? 'Yes' : 'No'}
        </Typography>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Treasury Address:</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {config.treasury.address}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Length: {config.treasury.address.length} | Type: {typeof config.treasury.address}
        </Typography>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Available Wallets:</Typography>
        {wallets?.map((wallet) => (
          <Chip
            key={wallet.id}
            label={`${wallet.metadata.name} - ${wallet.isActive ? 'Active' : 'Inactive'}`}
            size="small"
            color={wallet.isActive ? 'primary' : 'default'}
            sx={{ mr: 1, mb: 1 }}
          />
        ))}
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2">Connection Test Results:</Typography>
        <Chip 
          label={connectionTest.overall ? 'PASS' : 'FAIL'} 
          color={connectionTest.overall ? 'success' : 'error'} 
          size="small" 
        />
        {Object.entries(connectionTest.results).map(([testName, result]) => (
          <Box key={testName} sx={{ ml: 2, mt: 1 }}>
            <Typography variant="caption">
              {result.success ? '✅' : '❌'} {testName}: {result.message}
            </Typography>
          </Box>
        ))}
      </Box>
      
      <Box>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={() => {
            console.log('=== WALLET DEBUG TEST ===')
            console.log('activeAddress:', activeAddress)
            console.log('isReady:', isReady)
            console.log('wallets:', wallets)
            console.log('config:', config)
            console.log('connectionTest:', connectionTest)
            alert(`Address: ${activeAddress}\nLength: ${activeAddress?.length}\nReady: ${isReady}`)
          }}
        >
          Test Wallet Connection
        </Button>
      </Box>
    </Paper>
  )
}

export default WalletDebugger

import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
} from '@mui/material'
import { YouTube, AccountBalanceWallet } from '@mui/icons-material'
import { useWallet } from '@txnlab/use-wallet-react'

interface SignUpModalProps {
  open: boolean
  onClose: () => void
}

const SignUpModal: React.FC<SignUpModalProps> = ({ open, onClose }) => {
  const { wallets, activeAddress } = useWallet()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleWalletConnect = async (walletId: string) => {
    try {
      const wallet = wallets?.find((w) => w.id === walletId)
      if (wallet) {
        await wallet.connect()
      }
    } catch (err) {
      setError('Failed to connect wallet')
      console.error(err)
    }
  }

  const handleYouTubeConnect = () => {
    // YouTube OAuth will be implemented separately
    const clientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID
    const redirectUri = import.meta.env.VITE_YOUTUBE_REDIRECT_URI || window.location.origin + '/auth/callback'
    const scope = 'https://www.googleapis.com/auth/youtube.readonly'
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`
    
    window.location.href = authUrl
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (!activeAddress) {
      setError('Please connect your wallet')
      return
    }
    // Registration is handled by UserContext when wallet connects
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Join CitadelX
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Connect your wallet and YouTube channel to get started
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            placeholder="Enter your name"
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Connect Wallet
            </Typography>
            {activeAddress ? (
              <Alert severity="success" icon={<AccountBalanceWallet />}>
                Wallet Connected: {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {wallets?.map((wallet) => (
                  <Button
                    key={wallet.id}
                    variant="outlined"
                    startIcon={
                      wallet.metadata.icon ? (
                        <img
                          src={wallet.metadata.icon}
                          alt={wallet.metadata.name}
                          style={{ width: 24, height: 24 }}
                        />
                      ) : (
                        <AccountBalanceWallet />
                      )
                    }
                    onClick={() => handleWalletConnect(wallet.id)}
                    sx={{
                      justifyContent: 'flex-start',
                      borderColor: 'primary.main',
                      '&:hover': {
                        borderColor: 'primary.light',
                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                      },
                    }}
                  >
                    {wallet.metadata.name}
                  </Button>
                ))}
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Connect YouTube (Optional)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<YouTube />}
              fullWidth
              onClick={handleYouTubeConnect}
              sx={{
                justifyContent: 'flex-start',
                borderColor: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.light',
                  backgroundColor: 'rgba(255, 107, 0, 0.1)',
                },
              }}
            >
              Connect YouTube Channel
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          Complete Sign Up
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SignUpModal



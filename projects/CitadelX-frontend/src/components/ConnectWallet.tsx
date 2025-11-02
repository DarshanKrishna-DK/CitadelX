import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'
import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Chip,
} from '@mui/material'
import {
  Close,
  AccountBalanceWallet,
  Security,
  Speed,
  CheckCircle,
  Launch,
} from '@mui/icons-material'
import Account from './Account'
import { CitadelWalletManager } from '../utils/walletManager'

interface ConnectWalletInterface {
  openModal: boolean
  closeModal: () => void
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { wallets, activeAddress, isReady } = useWallet()
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null)

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  const getWalletFeatures = (walletId: string) => {
    switch (walletId) {
      case WalletId.PERA:
        return ['Mobile & Desktop', 'Hardware Wallet Support', 'DeFi Integration']
      case WalletId.DEFLY:
        return ['Advanced Trading', 'Portfolio Tracking', 'Multi-Account']
      case WalletId.EXODUS:
        return ['Built-in Exchange', 'Multi-Currency', 'User Friendly']
      case WalletId.KMD:
        return ['Local Development', 'Testing Environment', 'Full Node Access']
      default:
        return ['Secure Storage', 'Transaction Signing', 'dApp Integration']
    }
  }

  const getWalletDescription = (walletId: string) => {
    switch (walletId) {
      case WalletId.PERA:
        return 'The most popular Algorand wallet with comprehensive features'
      case WalletId.DEFLY:
        return 'Advanced wallet for traders and DeFi enthusiasts'
      case WalletId.EXODUS:
        return 'Multi-currency wallet with built-in exchange'
      case WalletId.KMD:
        return 'Local development wallet for testing'
      default:
        return 'Secure Algorand wallet for dApp interactions'
    }
  }

  const handleWalletConnect = async (wallet: Wallet) => {
    try {
      setIsConnecting(true)
      setConnectingWallet(wallet.id)
      setConnectionError(null)
      
      if (!wallet.isActive) {
        await wallet.connect()
        
        // Close modal after successful connect
        setTimeout(() => {
          closeModal()
        }, 1000)
      }
    } catch (err: any) {
      const errorMessage = CitadelWalletManager.handleConnectionError(err)
      setConnectionError(errorMessage)
      console.error('Wallet connection error:', err)
    } finally {
      setIsConnecting(false)
      setConnectingWallet(null)
    }
  }

  const handleDisconnect = async () => {
    try {
      if (wallets) {
        const activeWallet = wallets.find((w) => w.isActive)
        if (activeWallet) {
          await activeWallet.disconnect()
        } else {
          // Required for logout/cleanup of inactive providers
          localStorage.removeItem('@txnlab/use-wallet:v3')
          window.location.reload()
        }
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
    }
  }

  return (
    <Dialog
      open={openModal}
      onClose={closeModal}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          border: '1px solid rgba(255, 107, 0, 0.2)',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
              <AccountBalanceWallet />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'white' }}>
                Connect Wallet
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Choose your preferred Algorand wallet
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={closeModal} sx={{ color: 'text.secondary' }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {connectionError && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => setConnectionError(null)}
          >
            {connectionError}
          </Alert>
        )}

        {activeAddress ? (
          <Box sx={{ mb: 3 }}>
            <Card sx={{ 
              background: 'rgba(76, 175, 80, 0.1)', 
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: 2 
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CheckCircle sx={{ color: 'success.main' }} />
                  <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 600 }}>
                    Wallet Connected
                  </Typography>
                </Box>
                <Account />
              </CardContent>
            </Card>
            <Divider sx={{ my: 3 }} />
          </Box>
        ) : (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center' }}>
              Select a wallet to connect to CitadelX and start managing your DAOs
            </Typography>
          </Box>
        )}

        <Stack spacing={2}>
          {wallets?.map((wallet) => {
            const isConnecting = connectingWallet === wallet.id
            const features = getWalletFeatures(wallet.id)
            const description = getWalletDescription(wallet.id)

            return (
              <Card
                key={`provider-${wallet.id}`}
                sx={{
                  cursor: activeAddress ? 'default' : 'pointer',
                  transition: 'all 0.3s ease',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 107, 0, 0.2)',
                  borderRadius: 2,
                  '&:hover': activeAddress ? {} : {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(255, 107, 0, 0.2)',
                    borderColor: 'primary.main',
                  },
                  ...(wallet.isActive && {
                    background: 'rgba(255, 107, 0, 0.1)',
                    borderColor: 'primary.main',
                  })
                }}
                onClick={() => !activeAddress && !isConnecting && handleWalletConnect(wallet)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: 'background.paper',
                        border: '2px solid rgba(255, 107, 0, 0.2)',
                      }}
                    >
                      {!isKmd(wallet) && wallet.metadata.icon ? (
                        <img
                          alt={`${wallet.metadata.name} icon`}
                          src={wallet.metadata.icon}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            borderRadius: '50%'
                          }}
                        />
                      ) : (
                        <AccountBalanceWallet sx={{ color: 'primary.main' }} />
                      )}
                    </Avatar>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                          {isKmd(wallet) ? 'LocalNet Wallet' : wallet.metadata.name}
                        </Typography>
                        {wallet.isActive && (
                          <Chip
                            label="Connected"
                            size="small"
                            color="success"
                            icon={<CheckCircle />}
                          />
                        )}
                        {isConnecting && (
                          <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                        )}
                      </Box>

                      <Typography 
                        variant="body2" 
                        sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.4 }}
                      >
                        {description}
                      </Typography>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {features.map((feature, index) => (
                          <Chip
                            key={index}
                            label={feature}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: 'rgba(255, 107, 0, 0.3)',
                              color: 'text.secondary',
                              fontSize: '0.75rem',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {!activeAddress && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Launch sx={{ color: 'primary.main', opacity: 0.7 }} />
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Stack>

        {!activeAddress && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255, 107, 0, 0.05)', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Security sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                Secure Connection
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              Your wallet connection is encrypted and secure. CitadelX never stores your private keys.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={closeModal}
          variant="outlined"
          sx={{ 
            borderColor: 'rgba(255, 107, 0, 0.3)',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(255, 107, 0, 0.1)',
            }
          }}
        >
          Close
        </Button>
        {activeAddress && (
          <Button
            onClick={handleDisconnect}
            variant="contained"
            color="error"
            startIcon={<Close />}
          >
            Disconnect
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
export default ConnectWallet

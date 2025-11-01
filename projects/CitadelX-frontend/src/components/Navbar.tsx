import React, { useState, useEffect } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Avatar,
} from '@mui/material'
import { AccountBalanceWallet, Person, ExitToApp } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { useUser } from '../contexts/UserContext'
import { citadelWalletManager } from '../utils/walletManager'

const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const { activeAddress, wallets } = useWallet()
  const { user, logout } = useUser()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [balance, setBalance] = useState<string>('0')

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    try {
      // Use our enhanced wallet manager to disconnect all wallets and clear session
      await citadelWalletManager.disconnectAll()
      
      // Clear user context
      await logout()
      
      handleMenuClose()
      navigate('/')
    } catch (error) {
      console.error('Error during logout:', error)
      // Still navigate away even if logout fails
      handleMenuClose()
      navigate('/')
    }
  }

  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  useEffect(() => {
    const fetchBalance = async () => {
      if (!activeAddress) return
      
      try {
        const algodConfig = getAlgodConfigFromViteEnvironment()
        const algorand = AlgorandClient.fromConfig({
          algodConfig: {
            server: algodConfig.server,
            port: algodConfig.port,
            token: String(algodConfig.token),
          },
        })

        const accountInfo = await algorand.client.algod.accountInformation(activeAddress).do()
        const algoBalance = (Number(accountInfo.amount) / 1_000_000).toFixed(2)
        setBalance(algoBalance)
      } catch (error) {
        console.error('Error fetching balance:', error)
      }
    }

    if (activeAddress) {
      fetchBalance()
      const interval = setInterval(fetchBalance, 10000) // Update every 10 seconds
      return () => clearInterval(interval)
    }
    return undefined
  }, [activeAddress])

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography
            variant="h5"
            component="div"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #FF6B00 30%, #FF8C00 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          >
            CitadelX
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              color="inherit"
              onClick={() => navigate('/dashboard')}
              sx={{ '&:hover': { color: 'primary.main' } }}
            >
              Dashboard
            </Button>
            <Button
              color="inherit"
              onClick={() => navigate('/marketplace')}
              sx={{ '&:hover': { color: 'primary.main' } }}
            >
              Marketplace
            </Button>
            <Button
              color="inherit"
              onClick={() => navigate('/active-daos')}
              sx={{ '&:hover': { color: 'primary.main' } }}
            >
              Active DAOs
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            icon={<AccountBalanceWallet />}
            label={`${balance} ALGO`}
            sx={{
              backgroundColor: 'rgba(255, 107, 0, 0.1)',
              color: 'primary.main',
              fontWeight: 600,
              border: '1px solid rgba(255, 107, 0, 0.3)',
            }}
          />
          <Chip
            label={truncateAddress(activeAddress || '')}
            sx={{
              backgroundColor: 'rgba(255, 107, 0, 0.1)',
              color: 'text.primary',
              fontWeight: 500,
              border: '1px solid rgba(255, 107, 0, 0.3)',
            }}
          />
          {user?.name && (
            <Chip
              label={user.name}
              sx={{
                backgroundColor: 'rgba(255, 107, 0, 0.1)',
                color: 'text.primary',
                fontWeight: 500,
                border: '1px solid rgba(255, 107, 0, 0.3)',
              }}
            />
          )}
          <IconButton
            onClick={handleMenuOpen}
            sx={{
              border: '1px solid rgba(255, 107, 0, 0.3)',
              '&:hover': { backgroundColor: 'rgba(255, 107, 0, 0.1)' },
            }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              <Person />
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
              },
            }}
          >
            <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
              <Person sx={{ mr: 1 }} /> Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ExitToApp sx={{ mr: 1 }} /> Disconnect
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar



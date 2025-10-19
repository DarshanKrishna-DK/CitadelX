import { Navigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { CircularProgress, Box } from '@mui/material'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { activeAddress, isReady } = useWallet()

  if (!isReady) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    )
  }

  if (!activeAddress) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute



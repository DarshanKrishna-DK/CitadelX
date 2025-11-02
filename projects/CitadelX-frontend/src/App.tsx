import { WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { theme } from './theme/theme'
import { UserProvider } from './contexts/UserContext'
import { citadelWalletManager, CitadelWalletManager } from './utils/walletManager'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'
import CreateModerator from './pages/CreateModerator'
import ModeratorDetail from './pages/ModeratorDetail'
import Profile from './pages/Profile'

export default function App() {
  const walletManager = citadelWalletManager.getManager()

  // Setup session cleanup on component mount
  useEffect(() => {
    const cleanup = CitadelWalletManager.setupSessionCleanup()
    
    // Cleanup event listeners on component unmount
    return cleanup
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <WalletProvider manager={walletManager}>
          <UserProvider>
            <Router>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/marketplace"
                  element={
                    <ProtectedRoute>
                      <Marketplace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/create-moderator"
                  element={
                    <ProtectedRoute>
                      <CreateModerator />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/moderator/:id"
                  element={
                    <ProtectedRoute>
                      <ModeratorDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </UserProvider>
        </WalletProvider>
      </SnackbarProvider>
    </ThemeProvider>
  )
}

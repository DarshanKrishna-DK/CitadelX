import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Avatar,
  Chip,
  Stack,
  Paper,
  Divider,
} from '@mui/material'
import {
  SmartToy,
  Add,
  TrendingUp,
  AttachMoney,
  Speed,
  Psychology,
  Security,
  Storefront,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import Navbar from '../components/Navbar'
import ModeratorCard from '../components/ModeratorCard'
import { supabase, AIModerator } from '../utils/supabase'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const [loading, setLoading] = useState(true)
  const [myModerators, setMyModerators] = useState<AIModerator[]>([])
  const [purchasedModerators, setPurchasedModerators] = useState<AIModerator[]>([])
  const [earnings, setEarnings] = useState(0)
  const [totalSales, setTotalSales] = useState(0)

  useEffect(() => {
    if (activeAddress) {
      fetchDashboardData()
    }
  }, [activeAddress])

  const fetchDashboardData = async () => {
    if (!activeAddress) return

    try {
      setLoading(true)

      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', activeAddress)
        .single()

      if (!userData) {
        setLoading(false)
        return
      }

      // Fetch user's created moderators
      const { data: createdModerators } = await supabase
        .from('ai_moderators')
        .select('*')
        .eq('creator_id', userData.id)
        .order('created_at', { ascending: false })

      setMyModerators(createdModerators || [])

      // Fetch user's purchased moderators
      const { data: purchases } = await supabase
        .from('moderator_purchases')
        .select('moderator_id, ai_moderators(*)')
        .eq('buyer_wallet_address', activeAddress)

      if (purchases && purchases.length > 0) {
        const purchasedMods = purchases.map((p: any) => p.ai_moderators).filter(Boolean)
        setPurchasedModerators(purchasedMods || [])
      }

      // Calculate earnings from moderator sales
      const { data: sales } = await supabase
        .from('moderator_purchases')
        .select('amount_paid, ai_moderators!inner(creator_id)')
        .eq('ai_moderators.creator_id', userData.id)

      let totalEarnings = 0
      let salesCount = 0
      if (sales && sales.length > 0) {
        totalEarnings = sales.reduce((sum, sale) => sum + (sale.amount_paid || 0), 0)
        salesCount = sales.length
      }
      setEarnings(totalEarnings)
      setTotalSales(salesCount)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress size={60} />
          </Box>
        </Container>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
            Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Manage your AI moderators and track your earnings
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <SmartToy />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {myModerators.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created Moderators
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <AttachMoney />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {earnings.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Earnings (ALGO)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <TrendingUp />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {totalSales}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sales
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <Psychology />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {purchasedModerators.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Purchased Moderators
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          {/* My Created Moderators */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    My AI Moderators
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/create-moderator')}
                  >
                    Create New
                  </Button>
                </Box>
                {myModerators.length > 0 ? (
                  <Stack spacing={2}>
                    {myModerators.slice(0, 3).map((moderator) => (
                      <Paper key={moderator.id} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <SmartToy />
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {moderator.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {moderator.category}
                            </Typography>
                          </Box>
                          <Chip
                            label={moderator.status}
                            size="small"
                            color={
                              moderator.status === 'active' ? 'success' :
                              moderator.status === 'training' ? 'warning' : 'default'
                            }
                          />
                        </Box>
                      </Paper>
                    ))}
                    {myModerators.length > 3 && (
                      <Button
                        variant="text"
                        onClick={() => navigate('/profile')}
                        sx={{ alignSelf: 'center' }}
                      >
                        View All ({myModerators.length})
                      </Button>
                    )}
                  </Stack>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <SmartToy sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      You haven't created any AI moderators yet
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => navigate('/create-moderator')}
                    >
                      Create Your First Moderator
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Purchased Moderators */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Purchased Moderators
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Storefront />}
                    onClick={() => navigate('/marketplace')}
                  >
                    Browse Marketplace
                  </Button>
                </Box>
                {purchasedModerators.length > 0 ? (
                  <Stack spacing={2}>
                    {purchasedModerators.slice(0, 3).map((moderator) => (
                      <Paper key={moderator.id} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <Security />
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {moderator.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {moderator.category}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            onClick={() => navigate(`/moderator/${moderator.id}`)}
                          >
                            View
                          </Button>
                        </Box>
                      </Paper>
                    ))}
                    {purchasedModerators.length > 3 && (
                      <Button
                        variant="text"
                        onClick={() => navigate('/profile')}
                        sx={{ alignSelf: 'center' }}
                      >
                        View All ({purchasedModerators.length})
                      </Button>
                    )}
                  </Stack>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Storefront sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                      You haven't purchased any moderators yet
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Storefront />}
                      onClick={() => navigate('/marketplace')}
                    >
                      Browse Marketplace
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => navigate('/create-moderator')}
                  sx={{ py: 2 }}
                >
                  Create Moderator
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Storefront />}
                  onClick={() => navigate('/marketplace')}
                  sx={{ py: 2 }}
                >
                  Browse Marketplace
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Psychology />}
                  onClick={() => navigate('/profile')}
                  sx={{ py: 2 }}
                >
                  View Profile
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<TrendingUp />}
                  onClick={() => navigate('/profile')}
                  sx={{ py: 2 }}
                >
                  View Analytics
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </>
  )
}

export default Dashboard
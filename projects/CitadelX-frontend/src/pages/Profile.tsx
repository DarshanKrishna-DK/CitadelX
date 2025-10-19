import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material'
import { YouTube, AccountBalanceWallet, Edit } from '@mui/icons-material'
import { useWallet } from '@txnlab/use-wallet-react'
import Navbar from '../components/Navbar'
import { useUser } from '../contexts/UserContext'
import { supabase, DAO, ModeratorPurchase, AIModerator } from '../utils/supabase'

const Profile: React.FC = () => {
  const { activeAddress } = useWallet()
  const { user, updateUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [myDAOs, setMyDAOs] = useState<DAO[]>([])
  const [purchases, setPurchases] = useState<(ModeratorPurchase & { moderator: AIModerator })[]>([])
  const [totalEarnings, setTotalEarnings] = useState(0)

  useEffect(() => {
    if (user) {
      fetchProfileData()
    }
  }, [user])

  const fetchProfileData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Fetch user's DAOs
      const { data: daoMemberships } = await supabase
        .from('dao_members')
        .select('dao_id')
        .eq('user_id', user.id)

      if (daoMemberships && daoMemberships.length > 0) {
        const daoIds = daoMemberships.map((m) => m.dao_id)
        const { data: daos } = await supabase
          .from('daos')
          .select('*')
          .in('id', daoIds)

        setMyDAOs(daos || [])

        // Calculate earnings
        let earnings = 0
        const { data: revenues } = await supabase
          .from('dao_revenue')
          .select('total_revenue, dao_id')
          .in('dao_id', daoIds)

        if (revenues) {
          for (const rev of revenues) {
            const dao = daos?.find((d) => d.id === rev.dao_id)
            if (dao && dao.member_count > 0) {
              earnings += rev.total_revenue / dao.member_count
            }
          }
        }
        setTotalEarnings(earnings)
      }

      // Fetch purchases
      const { data: purchasesData } = await supabase
        .from('moderator_purchases')
        .select('*, ai_moderators(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (purchasesData) {
        const purchasesWithModerators = purchasesData.map((p: any) => ({
          ...p,
          moderator: p.ai_moderators,
        }))
        setPurchases(purchasesWithModerators)
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleYouTubeConnect = () => {
    const clientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID
    const redirectUri = import.meta.env.VITE_YOUTUBE_REDIRECT_URI || window.location.origin + '/auth/callback'
    const scope = 'https://www.googleapis.com/auth/youtube.readonly'

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`

    window.location.href = authUrl
  }

  const handleYouTubeDisconnect = async () => {
    try {
      await updateUser({ youtube_channel_id: undefined, youtube_channel_name: undefined })
    } catch (error) {
      console.error('Error disconnecting YouTube:', error)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <Box sx={{ backgroundColor: 'background.default', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
            My Profile
          </Typography>

          <Grid container spacing={3}>
            {/* Profile Info */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    Account Information
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Wallet Address
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 2,
                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                        borderRadius: 2,
                      }}
                    >
                      <AccountBalanceWallet sx={{ color: 'primary.main' }} />
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {user?.wallet_address}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      YouTube Channel
                    </Typography>
                    {user?.youtube_channel_name ? (
                      <Box>
                        <Alert
                          severity="success"
                          icon={<YouTube />}
                          action={
                            <Button size="small" color="inherit" onClick={handleYouTubeDisconnect}>
                              Disconnect
                            </Button>
                          }
                        >
                          {user.youtube_channel_name}
                        </Alert>
                      </Box>
                    ) : (
                      <Button
                        variant="outlined"
                        startIcon={<YouTube />}
                        fullWidth
                        onClick={handleYouTubeConnect}
                      >
                        Connect YouTube
                      </Button>
                    )}
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(255, 107, 0, 0.05)',
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Total Earnings
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {totalEarnings.toFixed(2)} ALGO
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* DAO Memberships */}
            <Grid item xs={12} md={8}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    DAO Memberships ({myDAOs.length})
                  </Typography>
                  {myDAOs.length > 0 ? (
                    <List>
                      {myDAOs.map((dao) => (
                        <ListItem
                          key={dao.id}
                          sx={{
                            border: '1px solid rgba(255, 107, 0, 0.2)',
                            borderRadius: 2,
                            mb: 1,
                          }}
                        >
                          <ListItemText
                            primary={dao.name}
                            secondary={`${dao.member_count} members • ${dao.treasury_balance.toFixed(2)} ALGO treasury`}
                          />
                          <Chip
                            label={dao.status}
                            color={dao.status === 'active' ? 'success' : 'warning'}
                            size="small"
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      You haven't joined any DAOs yet
                    </Typography>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Purchase History ({purchases.length})
                  </Typography>
                  {purchases.length > 0 ? (
                    <List>
                      {purchases.map((purchase) => (
                        <ListItem
                          key={purchase.id}
                          sx={{
                            border: '1px solid rgba(255, 107, 0, 0.2)',
                            borderRadius: 2,
                            mb: 1,
                          }}
                        >
                          <ListItemText
                            primary={purchase.moderator?.name || 'Unknown Moderator'}
                            secondary={`${purchase.purchase_type} • ${purchase.amount_paid} ALGO • ${new Date(
                              purchase.created_at,
                            ).toLocaleDateString()}`}
                          />
                          <Chip label={purchase.purchase_type} size="small" color="primary" />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      No purchases yet
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  )
}

export default Profile





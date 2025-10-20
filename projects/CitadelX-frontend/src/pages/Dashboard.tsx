import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  Group,
  SmartToy,
  AccountBalance,
  HowToVote,
  Add,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { useUser } from '../contexts/UserContext'
import Navbar from '../components/Navbar'
import StatsCard from '../components/StatsCard'
import DAOCard from '../components/DAOCard'
import ModeratorCard from '../components/ModeratorCard'
import { supabase, DAO, AIModerator, Proposal } from '../utils/supabase'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [myDAOs, setMyDAOs] = useState<DAO[]>([])
  const [myModerators, setMyModerators] = useState<AIModerator[]>([])
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([])
  const [stats, setStats] = useState({
    totalDAOs: 0,
    activeModerators: 0,
    totalEarnings: 0,
    pendingProposals: 0,
  })

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

      // Fetch user's DAOs
      const { data: daoMemberships } = await supabase
        .from('dao_members')
        .select('dao_id')
        .eq('user_id', userData.id)

      if (daoMemberships && daoMemberships.length > 0) {
        const daoIds = daoMemberships.map((m) => m.dao_id)
        const { data: daos } = await supabase
          .from('daos')
          .select('*')
          .in('id', daoIds)
          .order('created_at', { ascending: false })

        setMyDAOs(daos || [])
      }

      // Fetch user's moderators (owned through purchases)
      const { data: purchases } = await supabase
        .from('moderator_purchases')
        .select('moderator_id')
        .eq('user_id', userData.id)

      if (purchases && purchases.length > 0) {
        const moderatorIds = purchases.map((p) => p.moderator_id)
        const { data: moderators } = await supabase
          .from('ai_moderators')
          .select('*')
          .in('id', moderatorIds)

        setMyModerators(moderators || [])
      }

      // Fetch pending proposals from user's DAOs
      if (daoMemberships && daoMemberships.length > 0) {
        const daoIds = daoMemberships.map((m) => m.dao_id)
        const { data: proposals } = await supabase
          .from('proposals')
          .select('*')
          .in('dao_id', daoIds)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(5)

        setPendingProposals(proposals || [])
      }

      // Calculate earnings (simplified - sum of revenue from DAOs user is part of)
      let totalEarnings = 0
      if (daoMemberships && daoMemberships.length > 0) {
        const daoIds = daoMemberships.map((m) => m.dao_id)
        const { data: revenues } = await supabase
          .from('dao_revenue')
          .select('total_revenue, dao_id')
          .in('dao_id', daoIds)

        if (revenues) {
          // Simplified: divide revenue equally among members
          for (const rev of revenues) {
            const dao = myDAOs.find((d) => d.id === rev.dao_id)
            if (dao && dao.member_count > 0) {
              totalEarnings += rev.total_revenue / dao.member_count
            }
          }
        }
      }

      setStats({
        totalDAOs: myDAOs.length,
        activeModerators: myModerators.filter((m) => m.status === 'active').length,
        totalEarnings: totalEarnings,
        pendingProposals: pendingProposals.length,
      })
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
        <Container maxWidth="xl">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome back{user?.name ? `, ${user.name}` : ''}! Here's your CitadelX overview.
            </Typography>
          </Box>

          {/* Stats Overview */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="My DAOs"
                value={stats.totalDAOs}
                icon={<Group />}
                subtitle="Active memberships"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Active Moderators"
                value={stats.activeModerators}
                icon={<SmartToy />}
                subtitle="Currently deployed"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Total Earnings"
                value={`${stats.totalEarnings.toFixed(2)} ALGO`}
                icon={<AccountBalance />}
                subtitle="From DAO revenue"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                title="Pending Proposals"
                value={stats.pendingProposals}
                icon={<HowToVote />}
                subtitle="Awaiting your vote"
              />
            </Grid>
          </Grid>

          {/* My DAOs */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                My DAOs
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/dao/create')}
              >
                Create AI Moderator
              </Button>
            </Box>
            {myDAOs.length > 0 ? (
              <Grid container spacing={3}>
                {myDAOs.map((dao) => (
                  <Grid item xs={12} sm={6} md={4} key={dao.id}>
                    <DAOCard dao={dao} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Group sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    You haven't joined any DAOs yet
                  </Typography>
                  <Button variant="contained" onClick={() => navigate('/dao/create')}>
                    Create Your First AI Moderator
                  </Button>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Recent Activity */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Pending Proposals
                  </Typography>
                  {pendingProposals.length > 0 ? (
                    <List>
                      {pendingProposals.map((proposal) => (
                        <ListItem
                          key={proposal.id}
                          sx={{
                            border: '1px solid rgba(255, 107, 0, 0.2)',
                            borderRadius: 2,
                            mb: 1,
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 107, 0, 0.05)',
                            },
                          }}
                          onClick={() => {
                            const dao = myDAOs.find((d) => d.id === proposal.dao_id)
                            if (dao) navigate(`/dao/${dao.id}`)
                          }}
                        >
                          <ListItemText
                            primary={proposal.title}
                            secondary={`${proposal.current_votes}/${proposal.required_votes} votes`}
                          />
                          <Chip label="Vote Now" color="primary" size="small" />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      No pending proposals
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Active Moderators
                  </Typography>
                  {myModerators.length > 0 ? (
                    <Grid container spacing={2}>
                      {myModerators.slice(0, 2).map((moderator) => (
                        <Grid item xs={12} key={moderator.id}>
                          <ModeratorCard moderator={moderator} />
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No active moderators yet
                      </Typography>
                      <Button variant="outlined" onClick={() => navigate('/marketplace')}>
                        Browse Marketplace
                      </Button>
                    </Box>
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

export default Dashboard



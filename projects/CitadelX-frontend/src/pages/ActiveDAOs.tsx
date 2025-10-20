import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Fab,
  Paper,
  LinearProgress,
} from '@mui/material'
import { Search, Add, HowToVote, People, AccountBalance, Timer } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import Navbar from '../components/Navbar'
import { supabase, DAO, Proposal, MODERATOR_CATEGORIES, ModeratorCategoryId } from '../utils/supabase'

interface DAOWithProposal extends DAO {
  active_proposal?: Proposal
  user_is_member?: boolean
  user_has_voted?: boolean
}

const ActiveDAOs: React.FC = () => {
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const [loading, setLoading] = useState(true)
  const [daos, setDAOs] = useState<DAOWithProposal[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchActiveDAOs()
  }, [activeAddress])

  const fetchActiveDAOs = async () => {
    try {
      setLoading(true)

      // Fetch all DAOs with their active proposals
      const { data: daosData, error: daosError } = await supabase
        .from('daos')
        .select(`
          *,
          proposals!inner(*)
        `)
        .eq('proposals.status', 'active')
        .order('created_at', { ascending: false })

      if (daosError) throw daosError

      // Get user membership and voting status if logged in
      let userMemberships: any[] = []
      let userVotes: any[] = []
      
      if (activeAddress) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', activeAddress)
          .single()

        if (userData) {
          // Get user's DAO memberships
          const { data: memberships } = await supabase
            .from('dao_members')
            .select('dao_id')
            .eq('user_id', userData.id)

          userMemberships = memberships || []

          // Get user's votes on active proposals
          const proposalIds = daosData?.map(dao => dao.proposals[0]?.id).filter(Boolean) || []
          if (proposalIds.length > 0) {
            const { data: votes } = await supabase
              .from('proposal_votes')
              .select('proposal_id')
              .eq('user_id', userData.id)
              .in('proposal_id', proposalIds)

            userVotes = votes || []
          }
        }
      }

      // Process DAOs with additional info
      const processedDAOs: DAOWithProposal[] = (daosData || []).map(dao => {
        const activeProposal = dao.proposals?.[0]
        const userIsMember = userMemberships.some(m => m.dao_id === dao.id)
        const userHasVoted = activeProposal ? userVotes.some(v => v.proposal_id === activeProposal.id) : false

        return {
          ...dao,
          active_proposal: activeProposal,
          user_is_member: userIsMember,
          user_has_voted: userHasVoted,
        }
      })

      setDAOs(processedDAOs)
    } catch (error) {
      console.error('Error fetching active DAOs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinDAO = async (daoId: string) => {
    // This would trigger the join DAO flow with payment
    navigate(`/dao/${daoId}`)
  }

  const handleVote = async (daoId: string) => {
    navigate(`/dao/${daoId}`)
  }

  const filteredDAOs = daos.filter(dao => {
    // Search filter
    const matchesSearch = 
      dao.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dao.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dao.active_proposal?.title.toLowerCase().includes(searchQuery.toLowerCase()))

    // Category filter
    const matchesCategory = categoryFilter === 'all' || dao.category === categoryFilter

    // Status filter
    let matchesStatus = true
    if (statusFilter === 'can_join') {
      matchesStatus = !dao.user_is_member
    } else if (statusFilter === 'can_vote') {
      matchesStatus = dao.user_is_member && !dao.user_has_voted
    } else if (statusFilter === 'member') {
      matchesStatus = dao.user_is_member === true
    }

    return matchesSearch && matchesCategory && matchesStatus
  })

  const getProgressPercentage = (proposal: Proposal) => {
    return Math.min((proposal.current_votes / proposal.required_votes) * 100, 100)
  }

  const getDaysRemaining = (proposal: Proposal) => {
    const createdAt = new Date(proposal.created_at)
    const votingPeriod = 7 // Default voting period in days
    const endDate = new Date(createdAt.getTime() + votingPeriod * 24 * 60 * 60 * 1000)
    const now = new Date()
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    return Math.max(0, daysLeft)
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
              Active DAO Proposals
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Join DAOs and vote on AI moderator creation proposals
            </Typography>
          </Box>

          {/* Filters */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search DAOs and proposals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    label="Category"
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {Object.values(MODERATOR_CATEGORIES).map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All DAOs</MenuItem>
                    <MenuItem value="can_join">Can Join</MenuItem>
                    <MenuItem value="can_vote">Can Vote</MenuItem>
                    <MenuItem value="member">My DAOs</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/dao/create')}
                  startIcon={<Add />}
                >
                  Create DAO
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* DAOs Grid */}
          {filteredDAOs.length > 0 ? (
            <Grid container spacing={3}>
              {filteredDAOs.map((dao) => (
                <Grid item xs={12} md={6} lg={4} key={dao.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                      },
                    }}
                    onClick={() => navigate(`/dao/${dao.id}`)}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      {/* Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '1.5rem' }}>
                            {MODERATOR_CATEGORIES[dao.category as ModeratorCategoryId]?.icon || '🤖'}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {dao.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {dao.user_is_member && (
                            <Chip label="Member" color="primary" size="small" />
                          )}
                          {dao.user_has_voted && (
                            <Chip label="Voted" color="success" size="small" />
                          )}
                        </Box>
                      </Box>

                      {/* Category */}
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                        {MODERATOR_CATEGORIES[dao.category as ModeratorCategoryId]?.name || 'AI Moderator'}
                      </Typography>

                      {/* Description */}
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 60 }}>
                        {dao.description.length > 120 ? `${dao.description.substring(0, 120)}...` : dao.description}
                      </Typography>

                      {/* Stats */}
                      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <People sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            {dao.member_count}/{dao.min_members} members
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccountBalance sx={{ fontSize: 18, color: 'primary.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            {dao.treasury_balance.toFixed(1)} ALGO
                          </Typography>
                        </Box>
                      </Box>

                      {/* Proposal Progress */}
                      {dao.active_proposal && (
                        <Box sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Voting Progress
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Timer sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {getDaysRemaining(dao.active_proposal)} days left
                              </Typography>
                            </Box>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={getProgressPercentage(dao.active_proposal)}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: 'rgba(255, 107, 0, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: 'primary.main',
                              },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {dao.active_proposal.current_votes} / {dao.active_proposal.required_votes} votes needed
                          </Typography>
                        </Box>
                      )}

                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                        {!dao.user_is_member ? (
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={(e) => {
                              e.stopPropagation()
                              handleJoinDAO(dao.id)
                            }}
                            sx={{ fontWeight: 600 }}
                          >
                            Join DAO ({dao.min_stake} ALGO)
                          </Button>
                        ) : !dao.user_has_voted ? (
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<HowToVote />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleVote(dao.id)
                            }}
                            sx={{ fontWeight: 600 }}
                          >
                            Vote Now
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            fullWidth
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/dao/${dao.id}`)
                            }}
                          >
                            View Details
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                  {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? 'No DAOs found matching your filters'
                    : 'No active DAO proposals yet'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search filters'
                    : 'Be the first to create an AI moderator DAO!'}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/dao/create')}
                >
                  Create First DAO
                </Button>
              </CardContent>
            </Card>
          )}
        </Container>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
          }}
          onClick={() => navigate('/dao/create')}
        >
          <Add />
        </Fab>
      </Box>
    </>
  )
}

export default ActiveDAOs

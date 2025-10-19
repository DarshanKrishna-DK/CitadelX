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
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material'
import { People, AccountBalance, Add, HowToVote } from '@mui/icons-material'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import Navbar from '../components/Navbar'
import ProposalCard from '../components/ProposalCard'
import { supabase, DAO, Proposal, DAOMember, User } from '../utils/supabase'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

const DAODetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const [loading, setLoading] = useState(true)
  const [dao, setDao] = useState<DAO | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [members, setMembers] = useState<(DAOMember & { user: User })[]>([])
  const [userMembership, setUserMembership] = useState<DAOMember | null>(null)
  const [tabValue, setTabValue] = useState(0)

  useEffect(() => {
    if (id) {
      fetchDAOData()
    }
  }, [id, activeAddress])

  const fetchDAOData = async () => {
    if (!id) return

    try {
      setLoading(true)

      // Fetch DAO details
      const { data: daoData, error: daoError } = await supabase
        .from('daos')
        .select('*')
        .eq('id', id)
        .single()

      if (daoError) throw daoError
      setDao(daoData)

      // Fetch proposals
      const { data: proposalsData } = await supabase
        .from('proposals')
        .select('*')
        .eq('dao_id', id)
        .order('created_at', { ascending: false })

      setProposals(proposalsData || [])

      // Fetch members with user details
      const { data: membersData } = await supabase
        .from('dao_members')
        .select('*, users(*)')
        .eq('dao_id', id)

      if (membersData) {
        const membersWithUsers = membersData.map((m: any) => ({
          ...m,
          user: m.users,
        }))
        setMembers(membersWithUsers)
      }

      // Check if current user is a member
      if (activeAddress) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', activeAddress)
          .single()

        if (userData) {
          const { data: membershipData } = await supabase
            .from('dao_members')
            .select('*')
            .eq('dao_id', id)
            .eq('user_id', userData.id)
            .single()

          setUserMembership(membershipData)
        }
      }
    } catch (error) {
      console.error('Error fetching DAO data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinDAO = async () => {
    if (!activeAddress || !dao) return

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', activeAddress)
        .single()

      if (!userData) return

      // Add user as member
      await supabase.from('dao_members').insert([
        {
          dao_id: dao.id,
          user_id: userData.id,
          voting_power: 100, // Default voting power
        },
      ])

      // Update member count
      await supabase
        .from('daos')
        .update({ member_count: dao.member_count + 1 })
        .eq('id', dao.id)

      // Refresh data
      fetchDAOData()
    } catch (error) {
      console.error('Error joining DAO:', error)
    }
  }

  const handleVote = async (proposalId: string, voteType: 'yes' | 'no' | 'abstain') => {
    if (!activeAddress || !userMembership) return

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', activeAddress)
        .single()

      if (!userData) return

      // Record vote
      await supabase.from('proposal_votes').insert([
        {
          proposal_id: proposalId,
          user_id: userData.id,
          vote_weight: userMembership.voting_power,
          vote_type: voteType,
        },
      ])

      // Update proposal vote count
      const proposal = proposals.find((p) => p.id === proposalId)
      if (proposal && voteType === 'yes') {
        const newVoteCount = proposal.current_votes + userMembership.voting_power
        await supabase
          .from('proposals')
          .update({ current_votes: newVoteCount })
          .eq('id', proposalId)

        // Check if proposal should pass
        if (newVoteCount >= proposal.required_votes) {
          await supabase
            .from('proposals')
            .update({ status: 'passed' })
            .eq('id', proposalId)
        }
      }

      // Refresh data
      fetchDAOData()
    } catch (error) {
      console.error('Error voting:', error)
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

  if (!dao) {
    return (
      <>
        <Navbar />
        <Container>
          <Typography variant="h5" sx={{ mt: 4 }}>
            DAO not found
          </Typography>
        </Container>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <Box sx={{ backgroundColor: 'background.default', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Container maxWidth="xl">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {dao.name}
                </Typography>
                <Chip label={dao.status} color={dao.status === 'active' ? 'success' : 'warning'} />
              </Box>
              {!userMembership && (
                <Button variant="contained" size="large" onClick={handleJoinDAO} startIcon={<Add />}>
                  Join DAO
                </Button>
              )}
            </Box>
            <Typography variant="body1" color="text.secondary">
              {dao.description}
            </Typography>
          </Box>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <People sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {dao.member_count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Members
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AccountBalance sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {dao.treasury_balance.toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ALGO Treasury
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <HowToVote sx={{ fontSize: 40, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {proposals.filter((p) => p.status === 'active').length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Proposals
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Card>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
            >
              <Tab label="Proposals" />
              <Tab label="Members" />
              <Tab label="Treasury" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Box sx={{ px: 2 }}>
                {proposals.length > 0 ? (
                  <Grid container spacing={3}>
                    {proposals.map((proposal) => (
                      <Grid item xs={12} key={proposal.id}>
                        <ProposalCard
                          proposal={proposal}
                          onVote={handleVote}
                          userVotingPower={userMembership?.voting_power}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    No proposals yet
                  </Typography>
                )}
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ px: 2 }}>
                <List>
                  {members.map((member) => (
                    <ListItem
                      key={member.user_id}
                      sx={{
                        border: '1px solid rgba(255, 107, 0, 0.2)',
                        borderRadius: 2,
                        mb: 1,
                      }}
                    >
                      <ListItemText
                        primary={member.user.wallet_address}
                        secondary={`Voting Power: ${member.voting_power}`}
                      />
                      <Chip label={`${member.voting_power} VP`} size="small" color="primary" />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ px: 2, textAlign: 'center', py: 4 }}>
                <Typography variant="h5" color="text.secondary">
                  Treasury management coming soon
                </Typography>
              </Box>
            </TabPanel>
          </Card>
        </Container>
      </Box>
    </>
  )
}

export default DAODetail





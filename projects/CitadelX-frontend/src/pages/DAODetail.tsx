import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tab,
  Tabs,
  Avatar,
} from '@mui/material'
import {
  ArrowBack,
  People,
  AccountBalance,
  HowToVote,
  Add,
  ExitToApp,
  Security,
  TrendingUp,
} from '@mui/icons-material'
import { useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import Navbar from '../components/Navbar'
import { supabase } from '../utils/supabase'
import { getTestnetConfig } from '../config/testnet.config'

interface DAO {
  id: string
  name: string
  description: string
  category: string
  creator_id: string
  min_stake: number
  voting_period: number
  activation_threshold: number
  status: string
  created_at: string
  wallet_address: string
  blockchain_tx_id?: string
  ipfs_hash?: string
}

interface Member {
  id: string
  wallet_address: string
  stake_amount: number
  joined_at: string
  is_active: boolean
}

interface Proposal {
  id: string
  title: string
  description: string
  creator_id: string
  status: string
  votes_for: number
  votes_against: number
  created_at: string
  voting_ends_at: string
}

const DAODetail: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { activeAddress, signTransactions, sendTransactions } = useWallet()
  
  const [dao, setDao] = useState<DAO | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [userMembership, setUserMembership] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tabValue, setTabValue] = useState(0)
  
  // Join DAO dialog state
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [joinStake, setJoinStake] = useState(0)
  const [joinLoading, setJoinLoading] = useState(false)
  
  // Create proposal dialog state
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false)
  const [proposalTitle, setProposalTitle] = useState('')
  const [proposalDescription, setProposalDescription] = useState('')
  const [proposalLoading, setProposalLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchDAOData()
    }
  }, [id, activeAddress])

  const fetchDAOData = async () => {
    try {
      setLoading(true)
      
      // Fetch DAO info
      const { data: daoData, error: daoError } = await supabase
        .from('daos')
        .select('*')
        .eq('id', id)
        .single()

      if (daoError) throw daoError
      setDao(daoData)

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('dao_members')
        .select('*')
        .eq('dao_id', id)
        .eq('is_active', true)

      if (membersError) throw membersError
      setMembers(membersData || [])

      // Check user membership
      if (activeAddress) {
        const userMember = membersData?.find(m => m.wallet_address === activeAddress)
        setUserMembership(userMember || null)
      }

      // Fetch proposals
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('dao_proposals')
        .select('*')
        .eq('dao_id', id)
        .order('created_at', { ascending: false })

      if (proposalsError) throw proposalsError
      setProposals(proposalsData || [])

    } catch (error: any) {
      console.error('Error fetching DAO data:', error)
      setError(error.message || 'Failed to load DAO data')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinDAO = async () => {
    if (!dao || !activeAddress) return

    try {
      setJoinLoading(true)
      setError('')

      // Validate stake amount
      if (joinStake < dao.min_stake) {
        setError(`Minimum stake is ${dao.min_stake} ALGO`)
        return
      }

      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', activeAddress)
        .single()

      if (!userData) {
        throw new Error('User not found')
      }

      // Create payment transaction
      const config = getTestnetConfig()
      const algodClient = new algosdk.Algodv2(
        '',
        config.algod.server,
        config.algod.port
      )

      const suggestedParams = await algodClient.getTransactionParams().do()
      const stakeMicroAlgos = Math.floor(joinStake * 1_000_000)

      // Send payment to SimpleCitadelDAO smart contract
      const contractAppId = 748514129 // SimpleCitadelDAO deployed contract
      const contractAddress = algosdk.getApplicationAddress(contractAppId)
      
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAddress,
        to: contractAddress, // Send to smart contract instead of treasury
        amount: stakeMicroAlgos,
        suggestedParams: suggestedParams,
        note: new Uint8Array(Buffer.from(`DAO:${dao.id}:join_stake`)),
      })

      // Sign and send transaction
      const signedTxns = await signTransactions([paymentTxn])
      const { txId } = await sendTransactions(signedTxns)

      // Add member to database
      const { error: memberError } = await supabase
        .from('dao_members')
        .insert([
          {
            dao_id: dao.id,
            user_id: userData.id,
            wallet_address: activeAddress,
            stake_amount: joinStake,
            is_active: true,
          }
        ])

      if (memberError) throw memberError

      setJoinDialogOpen(false)
      setJoinStake(0)
      await fetchDAOData() // Refresh data

    } catch (error: any) {
      console.error('Error joining DAO:', error)
      setError(error.message || 'Failed to join DAO')
    } finally {
      setJoinLoading(false)
    }
  }

  const handleCreateProposal = async () => {
    if (!dao || !activeAddress || !userMembership) return

    try {
      setProposalLoading(true)
      setError('')

      // Validate inputs
      if (!proposalTitle.trim()) {
        setError('Proposal title is required')
        return
      }
      if (!proposalDescription.trim()) {
        setError('Proposal description is required')
        return
      }

      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', activeAddress)
        .single()

      if (!userData) {
        throw new Error('User not found')
      }

        // Calculate voting end date
        const votingEndDate = new Date()
        votingEndDate.setDate(votingEndDate.getDate() + dao.voting_period)

      // Create proposal in database
      const { error: proposalError } = await supabase
        .from('dao_proposals')
        .insert([
          {
            dao_id: dao.id,
            title: proposalTitle,
            description: proposalDescription,
            creator_id: userData.id,
            status: 'active',
            votes_for: 0,
            votes_against: 0,
            voting_ends_at: votingEndDate.toISOString(),
          }
        ])

      if (proposalError) throw proposalError

      setProposalDialogOpen(false)
      setProposalTitle('')
      setProposalDescription('')
      await fetchDAOData() // Refresh data

    } catch (error: any) {
      console.error('Error creating proposal:', error)
      setError(error.message || 'Failed to create proposal')
    } finally {
      setProposalLoading(false)
    }
  }

  const handleVote = async (proposalId: string, support: boolean) => {
    if (!activeAddress || !userMembership) return

    try {
      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', activeAddress)
        .single()

      if (!userData) {
        throw new Error('User not found')
      }

      // Record vote in database
      const { error: voteError } = await supabase
        .from('dao_votes')
        .insert([
          {
            proposal_id: proposalId,
            voter_id: userData.id,
            support: support,
            weight: userMembership.stake_amount,
          }
        ])

      if (voteError) throw voteError

      // Update proposal vote counts
      const proposal = proposals.find(p => p.id === proposalId)
      if (proposal) {
        const voteField = support ? 'votes_for' : 'votes_against'
        const newCount = proposal[voteField] + userMembership.stake_amount

        await supabase
          .from('dao_proposals')
          .update({ [voteField]: newCount })
          .eq('id', proposalId)
      }

      await fetchDAOData() // Refresh data

    } catch (error: any) {
      console.error('Error voting:', error)
      setError(error.message || 'Failed to cast vote')
    }
  }

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <People sx={{ mr: 1 }} />
              <Typography variant="h6">Members</Typography>
            </Box>
            <Typography variant="h4">{members.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Active members
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AccountBalance sx={{ mr: 1 }} />
              <Typography variant="h6">Treasury</Typography>
            </Box>
            <Typography variant="h4">
              {members.reduce((sum, member) => sum + member.stake_amount, 0).toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ALGO staked
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <HowToVote sx={{ mr: 1 }} />
              <Typography variant="h6">Proposals</Typography>
            </Box>
            <Typography variant="h4">{proposals.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Total proposals
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              DAO Information
            </Typography>
            <Typography variant="body1" paragraph>
              {dao?.description}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip label={`Category: ${dao?.category}`} />
              <Chip label={`Min Stake: ${dao?.min_stake} ALGO`} />
              <Chip label={`Voting Period: ${dao?.voting_period} days`} />
              <Chip label={`Activation: ${dao?.activation_threshold}%`} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )

  const renderMembersTab = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          DAO Members ({members.length})
        </Typography>
        <List>
          {members.map((member, index) => (
            <ListItem key={member.id} divider={index < members.length - 1}>
              <ListItemIcon>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {member.wallet_address.slice(0, 2).toUpperCase()}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={`${member.wallet_address.slice(0, 8)}...${member.wallet_address.slice(-8)}`}
                secondary={`Stake: ${member.stake_amount} ALGO • Joined: ${new Date(member.joined_at).toLocaleDateString()}`}
              />
              {member.wallet_address === dao?.wallet_address && (
                <Chip label="Creator" color="primary" size="small" />
              )}
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )

  const renderProposalsTab = () => (
    <Box>
      {userMembership && (
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setProposalDialogOpen(true)}
          >
            Create Proposal
          </Button>
        </Box>
      )}
      
      <Grid container spacing={2}>
        {proposals.map((proposal) => (
          <Grid item xs={12} key={proposal.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6">{proposal.title}</Typography>
                  <Chip 
                    label={proposal.status} 
                    color={proposal.status === 'active' ? 'primary' : 'default'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {proposal.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Typography variant="body2">
                    For: {proposal.votes_for} ALGO
                  </Typography>
                  <Typography variant="body2">
                    Against: {proposal.votes_against} ALGO
                  </Typography>
                </Box>
                {userMembership && proposal.status === 'active' && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      onClick={() => handleVote(proposal.id, true)}
                    >
                      Vote For
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleVote(proposal.id, false)}
                    >
                      Vote Against
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
        {proposals.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No proposals yet. {userMembership ? 'Create the first one!' : 'Join the DAO to create proposals.'}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  )

  if (loading) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </Box>
    )
  }

  if (!dao) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">DAO not found</Alert>
        </Container>
      </Box>
    )
  }

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                {dao.name}
              </Typography>
              <Chip 
                label={dao.status} 
                color={dao.status === 'active' ? 'success' : 'default'}
              />
            </Box>
            
            {!userMembership && activeAddress && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setJoinStake(dao.min_stake)
                  setJoinDialogOpen(true)
                }}
              >
                Join DAO
              </Button>
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Overview" />
            <Tab label="Members" />
            <Tab label="Proposals" />
          </Tabs>
        </Box>

        {tabValue === 0 && renderOverviewTab()}
        {tabValue === 1 && renderMembersTab()}
        {tabValue === 2 && renderProposalsTab()}

        {/* Join DAO Dialog */}
        <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Join DAO</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Stake ALGO to become a member of this DAO
            </Typography>
            <TextField
              fullWidth
              type="number"
              label="Stake Amount (ALGO)"
              value={joinStake}
              onChange={(e) => setJoinStake(parseFloat(e.target.value) || 0)}
              inputProps={{ min: dao.min_stake, step: 0.1 }}
              helperText={`Minimum: ${dao.min_stake} ALGO`}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleJoinDAO}
              disabled={joinLoading || joinStake < dao.min_stake}
            >
              {joinLoading ? <CircularProgress size={20} /> : 'Join DAO'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Create Proposal Dialog */}
        <Dialog open={proposalDialogOpen} onClose={() => setProposalDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create Proposal</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Proposal Title"
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              sx={{ mt: 2, mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Proposal Description"
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProposalDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateProposal}
              disabled={proposalLoading || !proposalTitle.trim() || !proposalDescription.trim()}
            >
              {proposalLoading ? <CircularProgress size={20} /> : 'Create Proposal'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
}

export default DAODetail

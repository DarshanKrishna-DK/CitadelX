import React, { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material'
import { CloudUpload } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import Navbar from '../components/Navbar'
import { supabase } from '../utils/supabase'

const CreateDAOProposal: React.FC = () => {
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    minMembers: 3,
    minStake: 10,
    votingPeriod: 7,
    activationThreshold: 66,
    treasuryContribution: 100,
  })

  const [contextDocuments, setContextDocuments] = useState<File[]>([])

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setContextDocuments(Array.from(event.target.files))
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('DAO name is required')
      return
    }
    if (!formData.description.trim()) {
      setError('Description is required')
      return
    }
    if (formData.minMembers < 1) {
      setError('Minimum members must be at least 1')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', activeAddress)
        .single()

      if (!userData) {
        throw new Error('User not found')
      }

      // Upload context documents (simplified - in production, upload to IPFS or cloud storage)
      const documentUrls: string[] = []
      // For now, store file names - real implementation would upload to IPFS
      contextDocuments.forEach((file) => {
        documentUrls.push(file.name)
      })

      // Create DAO
      const { data: daoData, error: daoError } = await supabase
        .from('daos')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            creator_id: userData.id,
            member_count: 1,
            treasury_balance: formData.treasuryContribution,
            status: 'pending',
          },
        ])
        .select()
        .single()

      if (daoError) throw daoError

      // Add creator as first member
      const { error: memberError } = await supabase
        .from('dao_members')
        .insert([
          {
            dao_id: daoData.id,
            user_id: userData.id,
            voting_power: 100,
          },
        ])

      if (memberError) throw memberError

      // Create proposal
      const { error: proposalError } = await supabase
        .from('proposals')
        .insert([
          {
            dao_id: daoData.id,
            title: `DAO Formation: ${formData.name}`,
            description: formData.description,
            criteria: {
              minMembers: formData.minMembers,
              minStake: formData.minStake,
              votingPeriod: formData.votingPeriod,
              activationThreshold: formData.activationThreshold,
              contextDocuments: documentUrls,
            },
            required_votes: formData.minMembers * formData.activationThreshold,
            current_votes: 100, // Creator's vote
            status: 'active',
          },
        ])

      if (proposalError) throw proposalError

      // Initialize DAO revenue tracking
      await supabase.from('dao_revenue').insert([
        {
          dao_id: daoData.id,
          total_revenue: 0,
        },
      ])

      setSuccess(true)
      setTimeout(() => {
        navigate(`/dao/${daoData.id}`)
      }, 2000)
    } catch (err: any) {
      console.error('Error creating DAO:', err)
      setError(err.message || 'Failed to create DAO proposal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <Box sx={{ backgroundColor: 'background.default', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Container maxWidth="md">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Create DAO Proposal
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Form a DAO to create and govern an AI moderator
            </Typography>
          </Box>

          <Card>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3}>
                {error && (
                  <Grid item xs={12}>
                    <Alert severity="error" onClose={() => setError('')}>
                      {error}
                    </Alert>
                  </Grid>
                )}

                {success && (
                  <Grid item xs={12}>
                    <Alert severity="success">
                      DAO proposal created successfully! Redirecting...
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Basic Information
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="DAO Name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g., Gaming Streamers Moderation DAO"
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe the purpose and goals of this DAO..."
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
                    Context Documents
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload documents to train your AI moderator (e.g., community guidelines, examples)
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUpload />}
                    fullWidth
                  >
                    Upload Documents
                    <input
                      type="file"
                      hidden
                      multiple
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                    />
                  </Button>
                  {contextDocuments.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {contextDocuments.length} file(s) selected
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
                    Proposal Criteria
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Minimum Members"
                    value={formData.minMembers}
                    onChange={(e) => handleChange('minMembers', parseInt(e.target.value))}
                    helperText="Required members to activate DAO"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Minimum Stake (ALGO)"
                    value={formData.minStake}
                    onChange={(e) => handleChange('minStake', parseFloat(e.target.value))}
                    helperText="Minimum stake per member"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Voting Period (days)"
                    value={formData.votingPeriod}
                    onChange={(e) => handleChange('votingPeriod', parseInt(e.target.value))}
                    helperText="Duration for voting on proposals"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Activation Threshold (%)"
                    value={formData.activationThreshold}
                    onChange={(e) => handleChange('activationThreshold', parseInt(e.target.value))}
                    helperText="Percentage of votes needed to pass"
                    inputProps={{ min: 51, max: 100 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Initial Treasury Contribution (ALGO)"
                    value={formData.treasuryContribution}
                    onChange={(e) => handleChange('treasuryContribution', parseFloat(e.target.value))}
                    helperText="Your initial contribution to the DAO treasury"
                  />
                </Grid>

                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleSubmit}
                    disabled={loading || success}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {loading ? 'Creating DAO...' : 'Create DAO Proposal'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  )
}

export default CreateDAOProposal





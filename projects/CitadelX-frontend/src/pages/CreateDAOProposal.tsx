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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material'
import { CloudUpload, Delete, Info, ArrowBack } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import algosdk from 'algosdk'
import Navbar from '../components/Navbar'
import { supabase, MODERATOR_CATEGORIES, ModeratorCategoryId } from '../utils/supabase'
import { CitadelDAOClient } from '../contracts/CitadelDAO'
import { uploadContextDocuments } from '../utils/ipfs'

const CreateDAOProposal: React.FC = () => {
  const navigate = useNavigate()
  const { activeAddress, signTransactions, sendTransactions } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '' as ModeratorCategoryId | '',
    minMembers: 3,
    minStake: 0.5, // ALGO
    votingPeriod: 7, // days
    treasuryContribution: 1, // ALGO
  })

  // Activation threshold is always 100% (set by platform)
  const activationThreshold = 100

  const [contextDocuments, setContextDocuments] = useState<File[]>([])
  const [documentTexts, setDocumentTexts] = useState<string[]>([])
  const [ipfsHash, setIpfsHash] = useState<string>('')
  const [uploadingToIPFS, setUploadingToIPFS] = useState(false)

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Calculate platform fee (1% of treasury contribution amount)
  const calculatePlatformFee = (treasuryContribution: number) => {
    return Math.max(0.01, treasuryContribution * 0.01) // Minimum 0.01 ALGO platform fee
  }

  const platformFee = calculatePlatformFee(formData.treasuryContribution)
  const totalCost = formData.treasuryContribution + platformFee

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files)
      setContextDocuments(files)
      
      // Read file contents for preview
      const texts: string[] = []
      for (const file of files) {
        try {
          const text = await file.text()
          texts.push(`${file.name}:\n${text}`)
        } catch (error) {
          console.error('Error reading file:', file.name, error)
          texts.push(`${file.name}: [Error reading file]`)
        }
      }
      setDocumentTexts(texts)

      // Upload to IPFS immediately for better UX
      if (files.length > 0) {
        try {
          setUploadingToIPFS(true)
          const result = await uploadContextDocuments(files)
          setIpfsHash(result.hash)
          console.log('Documents uploaded to IPFS:', result.url)
        } catch (error) {
          console.error('Failed to upload to IPFS:', error)
          setError('Failed to upload documents to IPFS. Please try again.')
        } finally {
          setUploadingToIPFS(false)
        }
      }
    }
  }

  const removeDocument = (index: number) => {
    setContextDocuments(prev => prev.filter((_, i) => i !== index))
    setDocumentTexts(prev => prev.filter((_, i) => i !== index))
    // Clear IPFS hash when documents change
    setIpfsHash('')
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
    if (!formData.category) {
      setError('AI Moderator category is required')
      return
    }
    if (contextDocuments.length === 0) {
      setError('At least one context document is required for AI training')
      return
    }
    if (!ipfsHash) {
      setError('Documents must be uploaded to IPFS first')
      return
    }
    if (formData.minMembers < 2) {
      setError('Minimum members must be at least 2')
      return
    }
    if (formData.minStake < 0.1) {
      setError('Minimum stake must be at least 0.1 ALGO')
      return
    }
    if (formData.treasuryContribution < formData.minStake) {
      setError('Treasury contribution must be at least the minimum stake amount')
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

      // Create blockchain transaction for DAO creation with payment
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algodClient = new algosdk.Algodv2(
        String(algodConfig.token),
        algodConfig.server,
        algodConfig.port
      )

      // Get suggested transaction parameters
      const suggestedParams = await algodClient.getTransactionParams().do()

      // Convert ALGO to microAlgos
      const minStakeMicroAlgos = Math.floor(formData.minStake * 1_000_000)
      const treasuryMicroAlgos = Math.floor(formData.treasuryContribution * 1_000_000)
      const platformFeeMicroAlgos = Math.floor(platformFee * 1_000_000)
      const totalPaymentMicroAlgos = treasuryMicroAlgos + platformFeeMicroAlgos
      const votingPeriodSeconds = formData.votingPeriod * 24 * 60 * 60

      // Platform treasury address from environment
      const treasuryAddress = import.meta.env.VITE_TREASURY_ADDRESS || 'RLUKWBU2COUQXFBMVR5Z4GRQERL3QDSBSGFECZYDTIUW4DH4LPSGCKDD7I'
      
      // Debug the actual values
      console.log('DEBUG - Transaction creation:', {
        activeAddress: activeAddress,
        treasuryAddress: treasuryAddress,
        amount: totalPaymentMicroAlgos,
        suggestedParams: suggestedParams
      })
      
      // Ensure activeAddress is available
      if (!activeAddress) {
        throw new Error('Wallet not connected. Please connect your wallet first.')
      }
      
      // Ensure all required parameters are present
      if (!treasuryAddress) {
        throw new Error('Treasury address not configured')
      }
      
      if (!suggestedParams) {
        throw new Error('Transaction parameters not available')
      }
      
      // Create payment transaction
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAddress,
        to: treasuryAddress,
        amount: totalPaymentMicroAlgos,
        note: new Uint8Array(Buffer.from(`CitadelX DAO Creation: ${formData.name}`)),
        suggestedParams: suggestedParams,
      })

      // Sign and send transaction using wallet
      const signedTxns = await signTransactions([paymentTxn])
      const { txId } = await sendTransactions(signedTxns)

      console.log('Payment transaction sent:', txId)

      // Wait for transaction confirmation
      await algosdk.waitForConfirmation(algodClient, txId, 4)

      // Create DAO in database with blockchain transaction reference
      const { data: daoData, error: daoError } = await supabase
        .from('daos')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            creator_id: userData.id,
            member_count: 1,
            treasury_balance: formData.treasuryContribution,
            min_members: formData.minMembers,
            min_stake: formData.minStake,
            voting_period: formData.votingPeriod,
            activation_threshold: activationThreshold,
            status: 'pending',
            blockchain_tx_id: txId,
            ipfs_hash: ipfsHash,
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
            stake_amount: formData.treasuryContribution,
          },
        ])

      if (memberError) throw memberError

      // Create proposal with context documents
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .insert([
          {
            dao_id: daoData.id,
            title: `${MODERATOR_CATEGORIES[formData.category].name} DAO Formation`,
            description: formData.description,
            category: formData.category,
            context_documents: [ipfsHash], // Store IPFS hash instead of raw text
            required_votes: Math.ceil((formData.minMembers * activationThreshold) / 100),
            current_votes: 1, // Creator's vote
            status: 'active',
          },
        ])
        .select()
        .single()

      if (proposalError) throw proposalError

      // Note: DAO revenue will be tracked when moderators generate income
      // No need to initialize revenue tracking here

      // Record creator's vote
      await supabase.from('proposal_votes').insert([
        {
          proposal_id: proposalData.id,
          user_id: userData.id,
          vote_type: 'yes',
        },
      ])

      console.log('DAO created successfully:', {
        daoId: daoData.id,
        proposalId: proposalData.id,
        transactionId: txId,
        ipfsHash: ipfsHash
      })
      
      setSuccess(true)
      setTimeout(() => {
        navigate('/active-daos')
      }, 3000)
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
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/dashboard')} sx={{ color: 'primary.main' }}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Create AI Moderator DAO
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Form a DAO to collectively build, train, and monetize an AI moderator
              </Typography>
            </Box>
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
                    placeholder="e.g., Gaming Community AI Moderators"
                    required
                    helperText="Choose a descriptive name for your DAO"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>AI Moderator Category</InputLabel>
                    <Select
                      value={formData.category}
                      label="AI Moderator Category"
                      onChange={(e) => handleChange('category', e.target.value)}
                    >
                      {Object.values(MODERATOR_CATEGORIES).map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography>{category.icon}</Typography>
                            <Box>
                              <Typography variant="body1">{category.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {category.description}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {formData.category && MODERATOR_CATEGORIES[formData.category as ModeratorCategoryId] && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Info sx={{ color: 'primary.main', fontSize: 20 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Selected Category: {MODERATOR_CATEGORIES[formData.category as ModeratorCategoryId]?.name || 'Unknown Category'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {MODERATOR_CATEGORIES[formData.category as ModeratorCategoryId]?.description || 'No description available'}
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="DAO Description & Goals"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe your DAO's mission, target community, and how the AI moderator will help..."
                    required
                    helperText="Explain what makes your DAO unique and why creators should join"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, mt: 2, fontWeight: 600 }}>
                    Context Documents *
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload documents to train your AI moderator. These should include community guidelines, 
                    moderation examples, rules, and any specific context for your community.
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUpload />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Upload Training Documents
                    <input
                      type="file"
                      hidden
                      multiple
                      accept=".txt,.pdf,.doc,.docx,.md"
                      onChange={handleFileUpload}
                    />
                  </Button>
                  
                  {contextDocuments.length > 0 && (
                    <Paper sx={{ p: 2, backgroundColor: 'background.paper' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Uploaded Documents ({contextDocuments.length}):
                      </Typography>
                      <List dense>
                        {contextDocuments.map((file, index) => (
                          <ListItem
                            key={index}
                            sx={{
                              border: '1px solid rgba(255, 107, 0, 0.2)',
                              borderRadius: 1,
                              mb: 1,
                            }}
                          >
                            <ListItemIcon>
                              <CloudUpload sx={{ color: 'primary.main' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={file.name}
                              secondary={`${(file.size / 1024).toFixed(1)} KB`}
                            />
                            <IconButton
                              edge="end"
                              onClick={() => removeDocument(index)}
                              sx={{ color: 'error.main' }}
                            >
                              <Delete />
                            </IconButton>
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
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
                    helperText="Required members to activate DAO (minimum 2)"
                    inputProps={{ min: 2, max: 50 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Minimum Stake (ALGO)"
                    value={formData.minStake}
                    onChange={(e) => handleChange('minStake', parseFloat(e.target.value))}
                    helperText="Minimum stake per member (minimum 0.1 ALGO)"
                    inputProps={{ min: 0.1, step: 0.1 }}
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
                    inputProps={{ min: 1, max: 30 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Activation Threshold (%)"
                    value="100%"
                    disabled
                    helperText="Set by platform - requires unanimous approval"
                    sx={{
                      '& .MuiInputBase-input.Mui-disabled': {
                        WebkitTextFillColor: 'rgba(255, 107, 0, 0.8)',
                        fontWeight: 600,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Initial Treasury Contribution (ALGO)"
                    value={formData.treasuryContribution}
                    onChange={(e) => handleChange('treasuryContribution', parseFloat(e.target.value))}
                    helperText="Your initial contribution to the DAO treasury (must be ≥ minimum stake)"
                    inputProps={{ min: 0.1, step: 0.1 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Paper sx={{ p: 3, backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                      Payment Breakdown
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Treasury Contribution:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{formData.treasuryContribution.toFixed(2)} ALGO</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Platform Fee (1% of treasury contribution):</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{platformFee.toFixed(3)} ALGO</Typography>
                      </Box>
                      {uploadingToIPFS && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">IPFS Upload:</Typography>
                          <CircularProgress size={16} />
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid rgba(255, 107, 0, 0.2)' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Total Payment:</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>{totalCost.toFixed(3)} ALGO</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper sx={{ p: 3, backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                      DAO Rules & Process
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      <strong>How DAOs Work:</strong>
                    </Typography>
                    <Box component="ol" sx={{ color: 'text.secondary', fontSize: '0.875rem', pl: 2 }}>
                      <li>You create a DAO proposal with your initial stake contribution</li>
                      <li>Other creators can join by staking the minimum amount</li>
                      <li>Once minimum members join, members vote on the proposal</li>
                      <li>If the proposal passes (≥{activationThreshold}% yes votes), the AI moderator is created as an NFT</li>
                      <li>The DAO can then list the moderator in the marketplace</li>
                      <li>Revenue from sales/subscriptions is distributed among DAO members</li>
                      <li>All decisions are made through transparent on-chain voting</li>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleSubmit}
                    disabled={loading || success || !formData.category || contextDocuments.length === 0 || !ipfsHash || uploadingToIPFS}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                    sx={{ py: 1.5 }}
                  >
                    {loading ? 'Creating DAO Proposal...' : `Create AI Moderator DAO (${totalCost.toFixed(3)} ALGO)`}
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    By creating this DAO, you agree to stake {formData.treasuryContribution} ALGO to the treasury
                  </Typography>
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





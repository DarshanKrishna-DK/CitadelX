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
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Chip,
} from '@mui/material'
import { ArrowBack, ArrowForward, CheckCircle } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { getTestnetConfig } from '../config/testnet.config'
import algosdk from 'algosdk'
import Navbar from '../components/Navbar'
import { supabase, MODERATOR_CATEGORIES, ModeratorCategoryId } from '../utils/supabase'
import { uploadContextDocuments } from '../utils/ipfs'

interface DAOFormData {
  name: string
  description: string
  category: ModeratorCategoryId | ''
  minStake: number
  votingPeriod: number
  activationThreshold: number
  initialStake: number
}

const steps = ['Basic Information', 'Governance Settings', 'Initial Stake', 'Review & Create']

const CreateDAO: React.FC = () => {
  const navigate = useNavigate()
  const { activeAddress, signTransactions, sendTransactions } = useWallet()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [txId, setTxId] = useState('')

  const [formData, setFormData] = useState<DAOFormData>({
    name: '',
    description: '',
    category: '',
    minStake: 0.5, // ALGO
    votingPeriod: 7, // days
    activationThreshold: 51, // percentage
    initialStake: 1.0, // ALGO
  })

  const [contextDocuments, setContextDocuments] = useState<File[]>([])
  const [ipfsHash, setIpfsHash] = useState('')

  const handleInputChange = (field: keyof DAOFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setContextDocuments(files)
  }

  const uploadDocuments = async () => {
    if (contextDocuments.length === 0) return ''

    try {
      setLoading(true)
      const result = await uploadContextDocuments(contextDocuments)
      setIpfsHash(result.ipfsHash)
      return result.ipfsHash
    } catch (error) {
      console.error('Failed to upload documents:', error)
      setError('Failed to upload context documents. Please try again.')
      return ''
    } finally {
      setLoading(false)
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Information
        if (!formData.name.trim()) {
          setError('DAO name is required')
          return false
        }
        if (!formData.description.trim()) {
          setError('DAO description is required')
          return false
        }
        if (!formData.category) {
          setError('AI Moderator category is required')
          return false
        }
        break
      case 1: // Governance Settings
        if (formData.minStake < 0.1) {
          setError('Minimum stake must be at least 0.1 ALGO')
          return false
        }
        if (formData.votingPeriod < 1) {
          setError('Voting period must be at least 1 day')
          return false
        }
        if (formData.activationThreshold < 1 || formData.activationThreshold > 100) {
          setError('Activation threshold must be between 1% and 100%')
          return false
        }
        break
      case 2: // Initial Stake
        if (formData.initialStake < formData.minStake) {
          setError('Initial stake must be at least the minimum stake amount')
          return false
        }
        break
    }
    setError('')
    return true
  }

  const handleNext = async () => {
    if (!validateStep(activeStep)) return

    if (activeStep === 0 && contextDocuments.length > 0) {
      // Upload documents when moving from step 0 to 1
      const hash = await uploadDocuments()
      if (!hash && contextDocuments.length > 0) return
    }

    setActiveStep(prev => prev + 1)
  }

  const handleBack = () => {
    setActiveStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) return
    if (!activeAddress) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Get user ID from database
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', activeAddress)
        .single()

      if (!userData) {
        throw new Error('User not found. Please ensure your wallet is connected.')
      }

      // Create DAO record in database first
      const { data: daoData, error: dbError } = await supabase
        .from('daos')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            creator_id: userData.id,
            member_count: 1,
            treasury_balance: formData.initialStake,
            min_members: 1, // Set to 1 for testing
            min_stake: formData.minStake,
            voting_period: formData.votingPeriod,
            activation_threshold: formData.activationThreshold,
            ipfs_hash: ipfsHash,
            status: 'pending',
          }
        ])
        .select()
        .single()

      if (dbError) throw dbError

      // Create blockchain transaction
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algodClient = new algosdk.Algodv2(
        String(algodConfig.token),
        algodConfig.server,
        algodConfig.port
      )

      const suggestedParams = await algodClient.getTransactionParams().do()
      const config = getTestnetConfig()

      // Convert ALGO to microAlgos
      const initialStakeMicroAlgos = Math.floor(formData.initialStake * 1_000_000)
      const votingPeriodSeconds = formData.votingPeriod * 24 * 60 * 60

      // Create payment transaction for initial stake
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAddress,
        to: config.treasury.address, // Temporary - will be DAO contract address
        amount: initialStakeMicroAlgos,
        suggestedParams: suggestedParams,
        note: new Uint8Array(Buffer.from(`DAO:${daoData.id}:initial_stake`)),
      })

      // Sign and send transaction
      const signedTxns = await signTransactions([paymentTxn])
      const { txId: transactionId } = await sendTransactions(signedTxns)

      // Create initial DAO member record
      await supabase
        .from('dao_members')
        .insert([
          {
            dao_id: daoData.id,
            user_id: userData.id,
            wallet_address: activeAddress,
            stake_amount: formData.initialStake,
            is_active: true,
          }
        ])

      // Update DAO record with transaction ID
      await supabase
        .from('daos')
        .update({
          blockchain_tx_id: transactionId,
          status: 'active',
        })
        .eq('id', daoData.id)

      setTxId(transactionId)
      setSuccess(true)
      
      // Navigate to DAO detail page after a delay
      setTimeout(() => {
        navigate(`/dao/${daoData.id}`)
      }, 3000)

    } catch (error: any) {
      console.error('Error creating DAO:', error)
      setError(error.message || 'Failed to create DAO. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="DAO Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter a unique name for your DAO"
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
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe your DAO's purpose and goals"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>AI Moderator Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  label="AI Moderator Category"
                >
                  {Object.entries(MODERATOR_CATEGORIES).map(([key, category]) => (
                    <MenuItem key={key} value={key}>
                      {category.name} - {category.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Context Documents (Optional)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Upload documents to train your AI moderator (PDF, TXT, DOC)
              </Typography>
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileUpload}
                style={{ marginTop: 8 }}
              />
              {contextDocuments.length > 0 && (
                <Box mt={2}>
                  {contextDocuments.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      variant="outlined"
                      style={{ margin: 4 }}
                    />
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        )

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Stake (ALGO)"
                value={formData.minStake}
                onChange={(e) => handleInputChange('minStake', parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0.1, step: 0.1 }}
                helperText="Minimum ALGO required for members to join (min: 0.1)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Voting Period (Days)"
                value={formData.votingPeriod}
                onChange={(e) => handleInputChange('votingPeriod', parseInt(e.target.value) || 1)}
                inputProps={{ min: 1, max: 30 }}
                helperText="How long proposals remain open for voting"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Activation Threshold (%)"
                value={formData.activationThreshold}
                onChange={(e) => handleInputChange('activationThreshold', parseInt(e.target.value) || 51)}
                inputProps={{ min: 1, max: 100 }}
                helperText="Percentage of total stake required for proposal to pass"
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Note:</strong> Minimum member count is set to 1 for testing purposes. 
                  You can create and test the DAO with just yourself as a member.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        )

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Your Initial Stake (ALGO)"
                value={formData.initialStake}
                onChange={(e) => handleInputChange('initialStake', parseFloat(e.target.value) || 0)}
                inputProps={{ min: formData.minStake, step: 0.1 }}
                helperText={`Must be at least ${formData.minStake} ALGO (minimum stake)`}
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="warning">
                <Typography variant="body2">
                  This amount will be transferred from your wallet to the DAO treasury. 
                  Make sure you have sufficient TestNet ALGO balance.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        )

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Review Your DAO Configuration
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Basic Information</strong>
                </Typography>
                <Typography>Name: {formData.name}</Typography>
                <Typography>Description: {formData.description}</Typography>
                <Typography>Category: {formData.category && MODERATOR_CATEGORIES[formData.category]?.name}</Typography>
                {ipfsHash && <Typography>Documents: Uploaded to IPFS</Typography>}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Governance Settings</strong>
                </Typography>
                <Typography>Minimum Stake: {formData.minStake} ALGO</Typography>
                <Typography>Voting Period: {formData.votingPeriod} days</Typography>
                <Typography>Activation Threshold: {formData.activationThreshold}%</Typography>
                <Typography>Minimum Members: 1 (testing mode)</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Financial</strong>
                </Typography>
                <Typography>Your Initial Stake: {formData.initialStake} ALGO</Typography>
                <Typography>Transaction Fee: ~0.001 ALGO</Typography>
              </Paper>
            </Grid>
          </Grid>
        )

      default:
        return null
    }
  }

  if (success) {
    return (
      <Box>
        <Navbar />
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                DAO Created Successfully!
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Your DAO "{formData.name}" has been created and is now active.
              </Typography>
              {txId && (
                <Typography variant="body2" sx={{ mt: 2, mb: 3 }}>
                  Transaction ID: {txId}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Redirecting to your DAO dashboard...
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    )
  }

  return (
    <Box>
      <Navbar />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate('/dashboard')}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          <Typography variant="h4" gutterBottom>
            Create New DAO
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Set up your decentralized autonomous organization for AI moderator governance
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {renderStepContent(activeStep)}

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0 || loading}
              >
                Back
              </Button>
              
              <Box>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading || !activeAddress}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {loading ? 'Creating DAO...' : 'Create DAO'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={loading}
                    endIcon={<ArrowForward />}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  )
}

export default CreateDAO

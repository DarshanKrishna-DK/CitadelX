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
  Avatar,
  Stack,
  InputAdornment,
} from '@mui/material'
import {
  ArrowBack,
  ArrowForward,
  CheckCircle,
  SmartToy,
  CloudUpload,
  AttachMoney,
  Security,
  Psychology,
  Speed,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import Navbar from '../components/Navbar'
import { supabase, MODERATOR_CATEGORIES, ModeratorCategoryId } from '../utils/supabase'
import { uploadContextDocuments, uploadFile } from '../utils/ipfs'

interface ModeratorFormData {
  name: string
  description: string
  category: ModeratorCategoryId | ''
  // Pricing (set by creator)
  hourlyPrice: number
  monthlyPrice: number
  buyoutPrice: number
}

const steps = ['Basic Information', 'Upload Content', 'Pricing', 'Review & Create']

const CreateModerator: React.FC = () => {
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<ModeratorFormData>({
    name: '',
    description: '',
    category: '',
    // Default pricing
    hourlyPrice: 0.1, // ALGO per hour
    monthlyPrice: 1.0, // ALGO per month
    buyoutPrice: 5.0, // ALGO for permanent ownership
  })

  const [contextDocuments, setContextDocuments] = useState<File[]>([])
  const [moderatorImage, setModeratorImage] = useState<File | null>(null)
  const [contextIpfsHash, setContextIpfsHash] = useState('')
  const [imageIpfsHash, setImageIpfsHash] = useState('')

  const handleInputChange = (field: keyof ModeratorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setContextDocuments(files)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setModeratorImage(file)
    }
  }

  const uploadDocuments = async () => {
    if (contextDocuments.length === 0) return ''

    try {
      setLoading(true)
      console.log(`Uploading ${contextDocuments.length} context documents...`)
      const result = await uploadContextDocuments(contextDocuments)
      setContextIpfsHash(result.hash)
      console.log('Context documents uploaded successfully:', result.hash)
      return result.hash
    } catch (error) {
      console.error('Failed to upload documents:', error)
      setError('Failed to upload context documents. Please try again.')
      return ''
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async () => {
    if (!moderatorImage) return ''

    try {
      setLoading(true)
      console.log('Uploading moderator image...')
      const result = await uploadFile(moderatorImage)
      setImageIpfsHash(result.hash)
      console.log('Moderator image uploaded successfully:', result.hash)
      return result.hash
    } catch (error) {
      console.error('Failed to upload moderator image:', error)
      setError('Failed to upload moderator image. Please try again.')
      return ''
    } finally {
      setLoading(false)
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Information
        if (!formData.name.trim()) {
          setError('Moderator name is required')
          return false
        }
        if (!formData.description.trim()) {
          setError('Description is required')
          return false
        }
        if (!formData.category) {
          setError('Please select a category')
          return false
        }
        break
      case 1: // Upload Content
        // Files are optional, so no validation needed
        break
      case 2: // Pricing
        if (formData.hourlyPrice < 0.01) {
          setError('Hourly price must be at least 0.01 ALGO')
          return false
        }
        if (formData.monthlyPrice < 0.1) {
          setError('Monthly price must be at least 0.1 ALGO')
          return false
        }
        if (formData.buyoutPrice < 1.0) {
          setError('Buyout price must be at least 1.0 ALGO')
          return false
        }
        if (formData.buyoutPrice <= formData.monthlyPrice) {
          setError('Buyout price should be higher than monthly price')
          return false
        }
        break
    }
    setError('')
    return true
  }

  const handleNext = async () => {
    if (!validateStep(activeStep)) return

    // Upload files when moving from step 1 to 2 (only if files are provided)
    if (activeStep === 1) {
      let documentsUploaded = true
      let imageUploaded = true

      // Upload context documents if provided
      if (contextDocuments.length > 0 && !contextIpfsHash) {
        const hash = await uploadDocuments()
        documentsUploaded = !!hash
      }

      // Upload moderator image if provided
      if (moderatorImage && !imageIpfsHash) {
        const hash = await uploadImage()
        imageUploaded = !!hash
      }

      // Only proceed if uploads succeeded (or no files to upload)
      if (!documentsUploaded || !imageUploaded) {
        return
      }
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
      
      console.log('✅ Creating AI Moderator...')
      console.log('Active address:', activeAddress)
      console.log('Form data:', formData)

      // Ensure files are uploaded to IPFS (may already be uploaded from previous steps)
      let finalImageHash = imageIpfsHash
      let finalContextHash = contextIpfsHash

      // Upload image if not already uploaded
      if (moderatorImage && !finalImageHash) {
        finalImageHash = await uploadImage()
        if (!finalImageHash) {
          setError('Failed to upload moderator image')
          return
        }
      }

      // Upload context documents if not already uploaded
      if (contextDocuments.length > 0 && !finalContextHash) {
        finalContextHash = await uploadDocuments()
        if (!finalContextHash) {
          setError('Failed to upload context documents')
          return
        }
      }

      // Set default values if no files provided
      if (!finalImageHash) finalImageHash = ''
      if (!finalContextHash) finalContextHash = ''

      console.log('✅ Moderator image IPFS hash:', finalImageHash)
      console.log('✅ Context documents IPFS hash:', finalContextHash)

      // Get or create user in database
      let userData
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', activeAddress)
          .single()

        if (existingUser) {
          userData = existingUser
        } else {
          // User doesn't exist, create them
          console.log('User not found, creating new user for wallet:', activeAddress)
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
              wallet_address: activeAddress,
              created_at: new Date().toISOString(),
            }])
            .select('id')
            .single()

          if (createError) {
            console.error('Error creating user:', createError)
            // Fallback: use wallet address as user ID
            userData = { id: activeAddress }
          } else {
            userData = newUser
          }
        }
      } catch (error) {
        console.error('Database error, using fallback user ID:', error)
        // Fallback: use wallet address as user ID for offline mode
        userData = { id: activeAddress }
      }

      if (!userData) {
        throw new Error('Failed to get or create user. Please try again.')
      }

      // Create AI Moderator record in database
      console.log('📝 Creating AI Moderator record in database...')
      const { data: moderatorData, error: dbError } = await supabase
        .from('ai_moderators')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            creator_id: userData.id,
            context_ipfs_hash: finalContextHash,
            image_ipfs_hash: finalImageHash,
            creator_set_hourly_price: formData.hourlyPrice,
            creator_set_monthly_price: formData.monthlyPrice,
            creator_set_buyout_price: formData.buyoutPrice,
            nft_asset_id: 0, // Will be set when NFT is created
            nft_creator_address: activeAddress,
            status: 'training', // Start in training status
          }
        ])
        .select()
        .single()

      if (dbError) {
        console.error('Database error creating moderator:', dbError)
        throw new Error(`Failed to create moderator in database: ${dbError.message}`)
      }

      if (!moderatorData) {
        throw new Error('Moderator creation failed - no data returned from database')
      }

      console.log('✅ AI Moderator record created successfully:', moderatorData.id)

      setSuccess(true)
      enqueueSnackbar('AI Moderator created successfully!', { variant: 'success' })
      
      // Navigate to moderator detail page after a delay
      setTimeout(() => {
        navigate(`/moderator/${moderatorData.id}`)
      }, 2000)

    } catch (error: any) {
      console.error('Error creating AI Moderator:', error)
      setError(error.message || 'Failed to create AI Moderator. Please try again.')
      enqueueSnackbar('Failed to create AI Moderator', { variant: 'error' })
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
                label="Moderator Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Content Guardian Pro"
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
                placeholder="Describe what your AI moderator does and how it helps communities..."
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => handleInputChange('category', e.target.value)}
                >
                  {Object.entries(MODERATOR_CATEGORIES).map(([key, category]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {formData.category && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255, 107, 0, 0.1)' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
                    {MODERATOR_CATEGORIES[formData.category as keyof typeof MODERATOR_CATEGORIES]?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {MODERATOR_CATEGORIES[formData.category as keyof typeof MODERATOR_CATEGORIES]?.description}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        )

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Upload Training Content (Optional)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Upload documents and images to train your AI moderator. This helps it understand your specific requirements.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, border: '2px dashed', borderColor: 'divider' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Context Documents
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload text files, PDFs, or documents that describe your moderation rules
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUpload />}
                  >
                    Choose Files
                    <input
                      type="file"
                      hidden
                      multiple
                      accept=".txt,.pdf,.doc,.docx,.md"
                      onChange={handleFileUpload}
                    />
                  </Button>
                  {contextDocuments.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="primary">
                        {contextDocuments.length} file(s) selected
                      </Typography>
                      {contextIpfsHash && (
                        <Chip
                          label="Uploaded to IPFS"
                          color="success"
                          size="small"
                          icon={<CheckCircle />}
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ p: 3, border: '2px dashed', borderColor: 'divider' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <SmartToy sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Moderator Image
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload an image to represent your AI moderator
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUpload />}
                  >
                    Choose Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </Button>
                  {moderatorImage && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="primary">
                        {moderatorImage.name}
                      </Typography>
                      {imageIpfsHash && (
                        <Chip
                          label="Uploaded to IPFS"
                          color="success"
                          size="small"
                          icon={<CheckCircle />}
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
          </Grid>
        )

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Set Your Pricing
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure how users can access your AI moderator. You can offer multiple pricing options.
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
                  <Speed />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  Hourly Access
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Price per Hour"
                  value={formData.hourlyPrice}
                  onChange={(e) => handleInputChange('hourlyPrice', parseFloat(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">ALGO</InputAdornment>,
                    inputProps: { min: 0.01, step: 0.01 }
                  }}
                  sx={{ mt: 2 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Users pay per hour of usage
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
                  <Psychology />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  Monthly License
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Price per Month"
                  value={formData.monthlyPrice}
                  onChange={(e) => handleInputChange('monthlyPrice', parseFloat(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">ALGO</InputAdornment>,
                    inputProps: { min: 0.1, step: 0.1 }
                  }}
                  sx={{ mt: 2 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Monthly subscription access
                </Typography>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ p: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
                  <Security />
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  Permanent Buyout
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Buyout Price"
                  value={formData.buyoutPrice}
                  onChange={(e) => handleInputChange('buyoutPrice', parseFloat(e.target.value) || 0)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">ALGO</InputAdornment>,
                    inputProps: { min: 1, step: 0.5 }
                  }}
                  sx={{ mt: 2 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  One-time purchase for permanent access
                </Typography>
              </Card>
            </Grid>
          </Grid>
        )

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Review Your AI Moderator
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
                {contextDocuments.length > 0 && (
                  <Typography>
                    Context Documents: {contextDocuments.length} file(s) 
                    {contextIpfsHash ? ` - Uploaded to IPFS (${contextIpfsHash.substring(0, 8)}...)` : ' - Ready to upload'}
                  </Typography>
                )}
                {moderatorImage && (
                  <Typography>
                    Moderator Image: {moderatorImage.name} 
                    {imageIpfsHash ? ` - Uploaded to IPFS (${imageIpfsHash.substring(0, 8)}...)` : ' - Ready to upload'}
                  </Typography>
                )}
                {!contextDocuments.length && !moderatorImage && (
                  <Typography color="text.secondary">
                    No files uploaded (optional)
                  </Typography>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Pricing</strong>
                </Typography>
                <Typography>Hourly: {formData.hourlyPrice} ALGO</Typography>
                <Typography>Monthly: {formData.monthlyPrice} ALGO</Typography>
                <Typography>Buyout: {formData.buyoutPrice} ALGO</Typography>
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
      <>
        <Navbar />
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Card sx={{ textAlign: 'center', p: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              AI Moderator Created Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your AI moderator is now being trained and will be available in the marketplace soon.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/marketplace')}
            >
              View Marketplace
            </Button>
          </Card>
        </Container>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
              Create AI Moderator
            </Typography>

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
                    {loading ? 'Creating Moderator...' : 'Create Moderator'}
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
    </>
  )
}

export default CreateModerator

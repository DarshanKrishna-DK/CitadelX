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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Avatar,
  Divider,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material'
import {
  SmartToy,
  Payments,
  Group,
  CheckCircle,
  Schedule,
  CalendarMonth,
  Star,
  Security,
  Psychology,
  Speed,
  TrendingUp,
  Info,
  Launch,
  ContentCopy,
  Share,
  Favorite,
  FavoriteBorder,
  History,
  Settings,
  Analytics,
} from '@mui/icons-material'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import Navbar from '../components/Navbar'
import { supabase, AIModerator, DAO, MODERATOR_CATEGORIES } from '../utils/supabase'
import { moderatorPurchaseService, PurchaseType } from '../services/moderatorPurchaseService'

interface PurchaseOption {
  type: PurchaseType
  label: string
  description: string
  icon: React.ReactNode
  duration?: number
}

const ModeratorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeAddress, signTransactions } = useWallet()
  const { enqueueSnackbar } = useSnackbar()

  // State
  const [loading, setLoading] = useState(true)
  const [moderator, setModerator] = useState<AIModerator | null>(null)
  const [dao, setDao] = useState<DAO | null>(null)
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false)
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<PurchaseType>('monthly')
  const [customDuration, setCustomDuration] = useState(1)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')
  const [hasAccess, setHasAccess] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [usageStats, setUsageStats] = useState({
    totalRequests: 0,
    successRate: 95.8,
    avgResponseTime: 120,
    uptime: 99.9,
  })

  useEffect(() => {
    if (id) {
      fetchModeratorData()
      if (activeAddress) {
        checkUserAccess()
      }
    }
  }, [id, activeAddress])

  const fetchModeratorData = async () => {
    try {
      setLoading(true)

      // Fetch moderator with DAO details
      const { data: moderatorData, error: moderatorError } = await supabase
        .from('ai_moderators')
        .select(`
          *,
          daos(
            id,
            name,
            description,
            category,
            creator_id,
            status,
            created_at,
            users(wallet_address, name)
          )
        `)
        .eq('id', id)
        .single()

      if (moderatorError) {
        throw new Error(`Failed to fetch moderator: ${moderatorError.message}`)
      }

      setModerator(moderatorData)
      setDao(moderatorData.daos)

      // Fetch usage statistics (this would come from actual usage data)
      // For now, we'll use simulated data
      setUsageStats({
        totalRequests: Math.floor(Math.random() * 10000) + 1000,
        successRate: 95 + Math.random() * 4,
        avgResponseTime: 100 + Math.random() * 100,
        uptime: 99 + Math.random(),
      })
    } catch (error) {
      console.error('Error fetching moderator data:', error)
      enqueueSnackbar('Failed to load moderator details', { variant: 'error' })
      navigate('/marketplace')
    } finally {
      setLoading(false)
    }
  }

  const checkUserAccess = async () => {
    if (!id || !activeAddress) return

    try {
      const access = await moderatorPurchaseService.hasActiveAccess(id, activeAddress)
      setHasAccess(access)
    } catch (error) {
      console.error('Error checking access:', error)
    }
  }

  const handlePurchase = async () => {
    if (!moderator || !activeAddress || !signTransactions) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'error' })
      return
    }

    try {
      setPurchasing(true)
      setPurchaseError('')

      let result
      switch (selectedPurchaseType) {
        case 'hourly':
          result = await moderatorPurchaseService.purchaseHourlyAccess(
            moderator.id,
            customDuration,
            activeAddress,
            signTransactions
          )
          break
        case 'monthly':
          result = await moderatorPurchaseService.purchaseMonthlyLicense(
            moderator.id,
            customDuration,
            activeAddress,
            signTransactions
          )
          break
        case 'buyout':
          result = await moderatorPurchaseService.buyoutModerator(
            moderator.id,
            activeAddress,
            signTransactions
          )
          break
      }

      if (result.success) {
        enqueueSnackbar('Purchase successful!', { variant: 'success' })
        setPurchaseDialogOpen(false)
        setHasAccess(true)
      } else {
        setPurchaseError(result.error || 'Purchase failed')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      setPurchaseError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setPurchasing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    enqueueSnackbar('Copied to clipboard', { variant: 'success' })
  }

  const toggleFavorite = () => {
    setIsFavorited(!isFavorited)
    enqueueSnackbar(
      isFavorited ? 'Removed from favorites' : 'Added to favorites',
      { variant: 'success' }
    )
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

  if (!moderator || !dao) {
    return (
      <>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error">Moderator not found</Alert>
        </Container>
      </>
    )
  }

  const categoryInfo = MODERATOR_CATEGORIES[moderator.category as keyof typeof MODERATOR_CATEGORIES]

  const purchaseOptions: PurchaseOption[] = [
    {
      type: 'hourly',
      label: 'Hourly Access',
      description: 'Pay per hour of usage',
      icon: <Schedule />,
      duration: customDuration,
    },
    {
      type: 'monthly',
      label: 'Monthly License',
      description: 'Full access for specified months',
      icon: <CalendarMonth />,
      duration: customDuration,
    },
    {
      type: 'buyout',
      label: 'Permanent Ownership',
      description: 'Own the moderator forever',
      icon: <Star />,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'training': return 'warning'
      case 'inactive': return 'error'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Security />
      case 'training': return <Psychology />
      case 'inactive': return <Speed />
      default: return <SmartToy />
    }
  }

  const formatPrice = (price: number) => `${price.toFixed(2)} ALGO`

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            {/* Header */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'primary.main',
                      mr: 3,
                      fontSize: '2rem',
                    }}
                  >
                    {categoryInfo?.icon || '🤖'}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mr: 2 }}>
                        {moderator.name}
                      </Typography>
                      <Tooltip title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}>
                        <IconButton onClick={toggleFavorite} color="primary">
                          {isFavorited ? <Favorite /> : <FavoriteBorder />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Share">
                        <IconButton onClick={() => copyToClipboard(window.location.href)}>
                          <Share />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
                      {dao.name} • {categoryInfo?.name || moderator.category}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        icon={getStatusIcon(moderator.status)}
                        label={moderator.status.charAt(0).toUpperCase() + moderator.status.slice(1)}
                        color={getStatusColor(moderator.status) as any}
                        variant="outlined"
                      />
                      {hasAccess && (
                        <Chip
                          icon={<CheckCircle />}
                          label="You have access"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Training Progress */}
                {moderator.status === 'training' && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Training Progress
                    </Typography>
                    <LinearProgress
                      variant="indeterminate"
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      AI model is being trained on your content. This may take several hours.
                    </Typography>
                  </Box>
                )}

                {/* Description */}
                <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
                  {moderator.description || categoryInfo?.description || 'AI-powered content moderation'}
                </Typography>

                {/* Features */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Features
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <TrendingUp color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Real-time Content Analysis"
                        secondary="Instant moderation with sub-second response times"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Security color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Advanced AI Models"
                        secondary="State-of-the-art machine learning for accurate detection"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Analytics color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Detailed Analytics"
                        secondary="Comprehensive reports and insights on moderation activity"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Settings color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Customizable Rules"
                        secondary="Configure moderation policies to match your community guidelines"
                      />
                    </ListItem>
                  </List>
                </Box>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  Performance Metrics
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                        {usageStats.totalRequests.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Requests
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                        {usageStats.successRate.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Success Rate
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                        {usageStats.avgResponseTime}ms
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Avg Response
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                        {usageStats.uptime.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Uptime
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Pricing Card */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Pricing
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule fontSize="small" color="action" />
                      <Typography variant="body2">Hourly</Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {formatPrice(moderator.creator_set_hourly_price)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarMonth fontSize="small" color="action" />
                      <Typography variant="body2">Monthly</Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {formatPrice(moderator.creator_set_monthly_price)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Star fontSize="small" color="action" />
                      <Typography variant="body2">Buyout</Typography>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {formatPrice(moderator.creator_set_buyout_price)}
                    </Typography>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                {hasAccess ? (
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<CheckCircle />}
                    disabled
                  >
                    You have access
                  </Button>
                ) : moderator.status === 'active' ? (
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={() => setPurchaseDialogOpen(true)}
                    startIcon={<Payments />}
                  >
                    Purchase Access
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    disabled
                    startIcon={<Psychology />}
                  >
                    {moderator.status === 'training' ? 'Training in Progress' : 'Not Available'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* DAO Information */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  DAO Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {dao.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {dao.description}
                  </Typography>
                  <Chip
                    label={dao.category}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(`/dao/${dao.id}`)}
                  startIcon={<Launch />}
                >
                  View DAO
                </Button>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Technical Details
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      NFT Asset ID
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {moderator.nft_asset_id}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(moderator.nft_asset_id.toString())}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body2">
                      {new Date(moderator.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  {moderator.activated_at && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Activated
                      </Typography>
                      <Typography variant="body2">
                        {new Date(moderator.activated_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Purchase Dialog */}
        <Dialog
          open={purchaseDialogOpen}
          onClose={() => setPurchaseDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Purchase Moderator Access</DialogTitle>
          <DialogContent>
            {purchaseError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {purchaseError}
              </Alert>
            )}

            <RadioGroup
              value={selectedPurchaseType}
              onChange={(e) => setSelectedPurchaseType(e.target.value as PurchaseType)}
            >
              {purchaseOptions.map((option) => (
                <FormControlLabel
                  key={option.type}
                  value={option.type}
                  control={<Radio />}
                  label={
                    <Box sx={{ py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        {option.icon}
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {option.label}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {option.description}
                      </Typography>
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                        {option.type === 'hourly'
                          ? formatPrice(moderator.creator_set_hourly_price * (option.duration || 1))
                          : option.type === 'monthly'
                          ? formatPrice(moderator.creator_set_monthly_price * (option.duration || 1))
                          : formatPrice(moderator.creator_set_buyout_price)
                        }
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>

            {(selectedPurchaseType === 'hourly' || selectedPurchaseType === 'monthly') && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Duration: {customDuration} {selectedPurchaseType === 'hourly' ? 'hours' : 'months'}
                </Typography>
                <Slider
                  value={customDuration}
                  onChange={(_, value) => setCustomDuration(value as number)}
                  min={1}
                  max={selectedPurchaseType === 'hourly' ? 24 : 12}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPurchaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              variant="contained"
              disabled={purchasing}
              startIcon={purchasing ? <CircularProgress size={20} /> : <Payments />}
            >
              {purchasing ? 'Processing...' : 'Purchase'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  )
}

export default ModeratorDetail

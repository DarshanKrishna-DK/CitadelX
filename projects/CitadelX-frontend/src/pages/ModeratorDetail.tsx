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
} from '@mui/material'
import { SmartToy, Payments, Group, CheckCircle } from '@mui/icons-material'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import Navbar from '../components/Navbar'
import { supabase, AIModerator, DAO } from '../utils/supabase'

const ModeratorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  const [loading, setLoading] = useState(true)
  const [moderator, setModerator] = useState<AIModerator | null>(null)
  const [dao, setDao] = useState<DAO | null>(null)
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false)
  const [selectedPricing, setSelectedPricing] = useState<'monthly' | 'pay_per_use' | 'outright'>('monthly')
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')

  useEffect(() => {
    if (id) {
      fetchModeratorData()
    }
  }, [id])

  const fetchModeratorData = async () => {
    if (!id) return

    try {
      setLoading(true)

      // Fetch moderator details
      const { data: moderatorData, error: moderatorError } = await supabase
        .from('ai_moderators')
        .select('*')
        .eq('id', id)
        .single()

      if (moderatorError) throw moderatorError
      setModerator(moderatorData)

      // Fetch DAO details
      if (moderatorData) {
        const { data: daoData } = await supabase
          .from('daos')
          .select('*')
          .eq('id', moderatorData.dao_id)
          .single()

        setDao(daoData)
      }
    } catch (error) {
      console.error('Error fetching moderator data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    if (!activeAddress || !moderator) return

    try {
      setPurchasing(true)
      setPurchaseError('')

      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', activeAddress)
        .single()

      if (!userData) {
        throw new Error('User not found')
      }

      // Get price based on selected model
      let price = 0
      if (selectedPricing === 'monthly' && moderator.monthly_price) {
        price = moderator.monthly_price
      } else if (selectedPricing === 'pay_per_use' && moderator.pay_per_use_price) {
        price = moderator.pay_per_use_price
      } else if (selectedPricing === 'outright' && moderator.outright_price) {
        price = moderator.outright_price
      }

      // In a real implementation, this would:
      // 1. Create an Algorand payment transaction to the DAO's wallet
      // 2. Wait for transaction confirmation
      // 3. Record the purchase
      // For now, we'll just record the purchase

      const txHash = `mock_tx_${Date.now()}` // Mock transaction hash

      // Record purchase
      await supabase.from('moderator_purchases').insert([
        {
          moderator_id: moderator.id,
          user_id: userData.id,
          purchase_type: selectedPricing,
          amount_paid: price,
          transaction_hash: txHash,
        },
      ])

      // Update DAO revenue
      if (dao) {
        const { data: revenueData } = await supabase
          .from('dao_revenue')
          .select('total_revenue')
          .eq('dao_id', dao.id)
          .single()

        const currentRevenue = revenueData?.total_revenue || 0
        await supabase
          .from('dao_revenue')
          .update({ total_revenue: currentRevenue + price })
          .eq('dao_id', dao.id)
      }

      setPurchaseDialogOpen(false)
      // Redirect to dashboard after successful purchase
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (error: any) {
      console.error('Error purchasing moderator:', error)
      setPurchaseError(error.message || 'Failed to purchase moderator')
    } finally {
      setPurchasing(false)
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

  if (!moderator) {
    return (
      <>
        <Navbar />
        <Container>
          <Typography variant="h5" sx={{ mt: 4 }}>
            Moderator not found
          </Typography>
        </Container>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <Box sx={{ backgroundColor: 'background.default', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {/* Main Content */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <SmartToy sx={{ fontSize: 48, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {moderator.name}
                      </Typography>
                      <Chip
                        label={moderator.status}
                        color={moderator.status === 'active' ? 'success' : 'info'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  </Box>

                  {dao && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 3,
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/dao/${dao.id}`)}
                    >
                      <Group sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Created by <strong>{dao.name}</strong>
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Description
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    {moderator.description}
                  </Typography>

                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Training Context
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This AI moderator has been trained on the following context documents:
                  </Typography>
                  {moderator.context_documents && moderator.context_documents.length > 0 ? (
                    <Box component="ul" sx={{ color: 'text.secondary' }}>
                      {moderator.context_documents.map((doc, index) => (
                        <li key={index}>{doc}</li>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No context documents available
                    </Typography>
                  )}

                  {moderator.nft_asset_id && (
                    <Box sx={{ mt: 4, p: 3, backgroundColor: 'rgba(255, 107, 0, 0.1)', borderRadius: 2 }}>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                        NFT Information
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Asset ID: {moderator.nft_asset_id}
                      </Typography>
                      {moderator.nft_metadata_url && (
                        <Typography variant="body2" color="text.secondary">
                          Metadata: {moderator.nft_metadata_url}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              <Card sx={{ position: 'sticky', top: 80 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    Pricing Options
                  </Typography>

                  {moderator.monthly_price && moderator.price_model.includes('monthly') && (
                    <Box
                      sx={{
                        p: 2,
                        mb: 2,
                        border: '2px solid',
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        backgroundColor: 'rgba(255, 107, 0, 0.05)',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Monthly Subscription
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {moderator.monthly_price} ALGO
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        per month
                      </Typography>
                    </Box>
                  )}

                  {moderator.pay_per_use_price && moderator.price_model.includes('pay_per_use') && (
                    <Box
                      sx={{
                        p: 2,
                        mb: 2,
                        border: '1px solid',
                        borderColor: 'rgba(255, 107, 0, 0.3)',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Pay Per Use
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {moderator.pay_per_use_price} ALGO
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        per use
                      </Typography>
                    </Box>
                  )}

                  {moderator.outright_price && moderator.price_model.includes('outright') && (
                    <Box
                      sx={{
                        p: 2,
                        mb: 3,
                        border: '1px solid',
                        borderColor: 'rgba(255, 107, 0, 0.3)',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        One-Time Purchase
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {moderator.outright_price} ALGO
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        lifetime access
                      </Typography>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<Payments />}
                    onClick={() => setPurchaseDialogOpen(true)}
                    disabled={moderator.status !== 'active'}
                  >
                    Purchase Now
                  </Button>

                  <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(255, 107, 0, 0.05)', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <CheckCircle sx={{ fontSize: 16 }} /> YouTube Integration Ready
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <CheckCircle sx={{ fontSize: 16 }} /> Real-time Moderation
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircle sx={{ fontSize: 16 }} /> Custom Training Context
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Purchase Dialog */}
      <Dialog open={purchaseDialogOpen} onClose={() => setPurchaseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Purchase AI Moderator</DialogTitle>
        <DialogContent>
          {purchaseError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPurchaseError('')}>
              {purchaseError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select your preferred pricing model:
          </Typography>
          <RadioGroup value={selectedPricing} onChange={(e) => setSelectedPricing(e.target.value as any)}>
            {moderator.monthly_price && moderator.price_model.includes('monthly') && (
              <FormControlLabel
                value="monthly"
                control={<Radio />}
                label={`Monthly Subscription - ${moderator.monthly_price} ALGO/month`}
              />
            )}
            {moderator.pay_per_use_price && moderator.price_model.includes('pay_per_use') && (
              <FormControlLabel
                value="pay_per_use"
                control={<Radio />}
                label={`Pay Per Use - ${moderator.pay_per_use_price} ALGO/use`}
              />
            )}
            {moderator.outright_price && moderator.price_model.includes('outright') && (
              <FormControlLabel
                value="outright"
                control={<Radio />}
                label={`One-Time Purchase - ${moderator.outright_price} ALGO`}
              />
            )}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchaseDialogOpen(false)} disabled={purchasing}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handlePurchase} disabled={purchasing}>
            {purchasing ? 'Processing...' : 'Confirm Purchase'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ModeratorDetail





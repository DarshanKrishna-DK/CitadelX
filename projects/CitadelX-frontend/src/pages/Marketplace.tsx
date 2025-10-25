import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material'
import { Search } from '@mui/icons-material'
import Navbar from '../components/Navbar'
import ModeratorCard from '../components/ModeratorCard'
import { supabase, AIModerator, DAO } from '../utils/supabase'
import { moderatorPurchaseService, PurchaseType, PurchaseData } from '../services/moderatorPurchaseService'
import { useWallet } from '@txnlab/use-wallet-react'

const Marketplace: React.FC = () => {
  const { activeAddress, signTransactions } = useWallet()
  const [loading, setLoading] = useState(true)
  const [moderators, setModerators] = useState<AIModerator[]>([])
  const [daos, setDAOs] = useState<Record<string, DAO>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [priceFilter, setPriceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    fetchModerators()
  }, [])

  const fetchModerators = async () => {
    try {
      setLoading(true)

      // Fetch all active moderators
      const { data: moderatorsData, error } = await supabase
        .from('ai_moderators')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      setModerators(moderatorsData || [])

      // Fetch DAO information for each moderator
      if (moderatorsData && moderatorsData.length > 0) {
        const daoIds = [...new Set(moderatorsData.map((m) => m.dao_id))]
        const { data: daosData } = await supabase.from('daos').select('*').in('id', daoIds)

        if (daosData) {
          const daosMap: Record<string, DAO> = {}
          daosData.forEach((dao) => {
            daosMap[dao.id] = dao
          })
          setDAOs(daosMap)
        }
      }
    } catch (error) {
      console.error('Error fetching moderators:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (
    moderator: AIModerator,
    purchaseType: PurchaseType,
    amount: number = 1
  ) => {
    if (!activeAddress || !signTransactions) {
      alert('Please connect your wallet first')
      return
    }

    try {
      setPurchasing(moderator.id)

      // Get current pricing from database (set by DAO creator)
      const pricing = await moderatorPurchaseService.getModeratorPricing(
        moderator.id
      )

      // Calculate total cost
      const totalCost = moderatorPurchaseService.calculateTotalCost(
        purchaseType,
        amount,
        pricing
      )

      // Create purchase data
      const purchaseData: PurchaseData = {
        moderatorId: moderator.id,
        moderatorName: moderator.name,
        purchaseType,
        amount,
        priceAlgo: totalCost
      }

      let result
      switch (purchaseType) {
        case PurchaseType.HOURLY:
          result = await moderatorPurchaseService.purchaseHourlyAccess(
            purchaseData,
            activeAddress,
            signTransactions
          )
          break
        case PurchaseType.MONTHLY:
          result = await moderatorPurchaseService.purchaseMonthlyLicense(
            purchaseData,
            activeAddress,
            signTransactions
          )
          break
        case PurchaseType.BUYOUT:
          result = await moderatorPurchaseService.buyoutModerator(
            purchaseData,
            activeAddress,
            signTransactions
          )
          break
        default:
          throw new Error('Invalid purchase type')
      }

      if (result.success) {
        alert(`🎉 Purchase successful! Transaction: ${result.transactionId}`)
        
        // Record purchase in database
        await recordPurchase(moderator, purchaseType, amount, result.transactionId!)
      } else {
        alert(`❌ Purchase failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Purchase error:', error)
      alert(`❌ Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setPurchasing(null)
    }
  }

  const recordPurchase = async (
    moderator: AIModerator,
    purchaseType: PurchaseType,
    amount: number,
    transactionHash: string
  ) => {
    try {
      // Get user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', activeAddress)
        .single()

      if (!userData) {
        console.error('User not found in database')
        return
      }

      // Calculate amount paid based on purchase type and current pricing
      const pricing = await moderatorPurchaseService.getModeratorPricing(
        moderator.id
      )
      const amountPaid = moderatorPurchaseService.calculateTotalCost(
        purchaseType,
        amount,
        pricing
      )

      // Record the purchase
      const { error } = await supabase
        .from('moderator_purchases')
        .insert([{
          moderator_id: moderator.id,
          user_id: userData.id,
          purchase_type: purchaseType === PurchaseType.HOURLY ? 'hourly' : 
                        purchaseType === PurchaseType.MONTHLY ? 'monthly' : 'outright',
          amount_paid: amountPaid,
          transaction_hash: transactionHash
        }])

      if (error) {
        console.error('Failed to record purchase:', error)
      } else {
        console.log('✅ Purchase recorded in database')
      }
    } catch (error) {
      console.error('Error recording purchase:', error)
    }
  }

  const filteredModerators = moderators.filter((mod) => {
    // Search filter
    const matchesSearch =
      mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchQuery.toLowerCase())

    // Price filter
    let matchesPrice = true
    if (priceFilter === 'monthly' && !mod.price_model.includes('monthly')) matchesPrice = false
    if (priceFilter === 'pay_per_use' && !mod.price_model.includes('pay_per_use')) matchesPrice = false
    if (priceFilter === 'outright' && !mod.price_model.includes('outright')) matchesPrice = false

    // Status filter
    const matchesStatus = statusFilter === 'all' || mod.status === statusFilter

    return matchesSearch && matchesPrice && matchesStatus
  })

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
              AI Moderator Marketplace
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Discover and purchase AI moderators trained by the community
            </Typography>
          </Box>

          {/* Filters */}
          <Box sx={{ mb: 4 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Search moderators..."
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
                  <InputLabel>Price Model</InputLabel>
                  <Select
                    value={priceFilter}
                    label="Price Model"
                    onChange={(e) => setPriceFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Models</MenuItem>
                    <MenuItem value="monthly">Monthly Subscription</MenuItem>
                    <MenuItem value="pay_per_use">Pay Per Use</MenuItem>
                    <MenuItem value="outright">Outright Purchase</MenuItem>
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
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="training">Training</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Moderators Grid */}
          {filteredModerators.length > 0 ? (
            <Grid container spacing={3}>
              {filteredModerators.map((moderator) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={moderator.id}>
                  <ModeratorCard
                    moderator={moderator}
                    daoName={daos[moderator.dao_id]?.name}
                    onPurchase={handlePurchase}
                    purchasing={purchasing === moderator.id}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                  {searchQuery || priceFilter !== 'all' || statusFilter !== 'all'
                    ? 'No moderators found matching your filters'
                    : 'No moderators available yet'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchQuery || priceFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search filters'
                    : 'Create a DAO and train your own AI moderator to get started'}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Container>
      </Box>
    </>
  )
}

export default Marketplace





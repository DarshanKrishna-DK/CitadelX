import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Avatar,
} from '@mui/material'
import {
  Search,
  Add,
  People,
  AccountBalance,
  TrendingUp,
  FilterList,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import Navbar from '../components/Navbar'
import { supabase, MODERATOR_CATEGORIES } from '../utils/supabase'

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
  member_count?: number
  total_stake?: number
}

interface DAOWithStats extends DAO {
  member_count: number
  total_stake: number
  is_member: boolean
}

const ActiveDAOs: React.FC = () => {
  const navigate = useNavigate()
  const { activeAddress } = useWallet()
  
  const [daos, setDaos] = useState<DAOWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sortBy, setSortBy] = useState('created_at')

  useEffect(() => {
    fetchDAOs()
  }, [activeAddress])

  const fetchDAOs = async () => {
    try {
      setLoading(true)
      
      // Fetch DAOs with member statistics
      const { data: daosData, error: daosError } = await supabase
        .from('daos')
        .select(`
          *,
          dao_members!inner(
            id,
            wallet_address,
            stake_amount,
            is_active
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (daosError) throw daosError

      // Process DAO data and calculate statistics
      const processedDAOs: DAOWithStats[] = []
      
      for (const dao of daosData || []) {
        const activeMembers = dao.dao_members?.filter((m: any) => m.is_active) || []
        const totalStake = activeMembers.reduce((sum: number, member: any) => sum + member.stake_amount, 0)
        const isMember = activeAddress ? activeMembers.some((m: any) => m.wallet_address === activeAddress) : false

        processedDAOs.push({
          ...dao,
          member_count: activeMembers.length,
          total_stake: totalStake,
          is_member: isMember,
        })
      }

      setDaos(processedDAOs)
      
    } catch (error: any) {
      console.error('Error fetching DAOs:', error)
      setError(error.message || 'Failed to load DAOs')
    } finally {
      setLoading(false)
    }
  }

  const filteredDAOs = daos.filter(dao => {
    const matchesSearch = dao.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dao.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || dao.category === categoryFilter
    const matchesStatus = !statusFilter || dao.status === statusFilter
    
    return matchesSearch && matchesCategory && matchesStatus
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'members':
        return b.member_count - a.member_count
      case 'stake':
        return b.total_stake - a.total_stake
      case 'created_at':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  const renderDAOCard = (dao: DAOWithStats) => (
    <Grid item xs={12} md={6} lg={4} key={dao.id}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              {dao.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={dao.status} 
                color={dao.status === 'active' ? 'success' : 'default'}
                size="small"
              />
              {dao.is_member && (
                <Chip 
                  label="Member" 
                  color="primary" 
                  size="small"
                />
              )}
            </Box>
          </Box>
          
          <Typography variant="h6" gutterBottom>
            {dao.name}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
            {dao.description.length > 100 
              ? `${dao.description.substring(0, 100)}...` 
              : dao.description
            }
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Chip 
              label={MODERATOR_CATEGORIES[dao.category as keyof typeof MODERATOR_CATEGORIES]?.name || dao.category}
              variant="outlined"
              size="small"
            />
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <People sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {dao.member_count} member{dao.member_count !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AccountBalance sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {dao.total_stake.toFixed(2)} ALGO
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            Min Stake: {dao.min_stake} ALGO • Activation: {dao.activation_threshold}%
          </Typography>
        </CardContent>
        
        <CardActions>
          <Button
            size="small"
            onClick={() => navigate(`/dao/${dao.id}`)}
          >
            View Details
          </Button>
          {!dao.is_member && activeAddress && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate(`/dao/${dao.id}`)}
            >
              Join DAO
            </Button>
          )}
        </CardActions>
      </Card>
    </Grid>
  )

  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" gutterBottom>
              Active DAOs
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/dao/create')}
              disabled={!activeAddress}
            >
              Create DAO
            </Button>
          </Box>
          
          {!activeAddress && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Connect your wallet to create or join DAOs
            </Alert>
          )}
        </Box>

        {/* Filters and Search */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterList sx={{ mr: 1 }} />
            Filters & Search
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search DAOs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {Object.entries(MODERATOR_CATEGORIES).map(([key, category]) => (
                    <MenuItem key={key} value={key}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="creating">Creating</MenuItem>
                  <MenuItem value="paused">Paused</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="created_at">Newest</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="members">Members</MenuItem>
                  <MenuItem value="stake">Total Stake</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('')
                  setCategoryFilter('')
                  setStatusFilter('active')
                  setSortBy('created_at')
                }}
                sx={{ height: '56px' }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* DAOs Grid */}
        {!loading && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6">
                {filteredDAOs.length} DAO{filteredDAOs.length !== 1 ? 's' : ''} found
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              {filteredDAOs.map(renderDAOCard)}
            </Grid>
            
            {filteredDAOs.length === 0 && !loading && (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No DAOs found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {searchTerm || categoryFilter 
                    ? 'Try adjusting your search criteria or filters'
                    : 'Be the first to create a DAO!'
                  }
                </Typography>
                {activeAddress && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/dao/create')}
                  >
                    Create First DAO
                  </Button>
                )}
              </Paper>
            )}
          </>
        )}

        {/* Statistics Summary */}
        {!loading && filteredDAOs.length > 0 && (
          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Network Statistics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {daos.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total DAOs
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {daos.reduce((sum, dao) => sum + dao.member_count, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Members
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {daos.reduce((sum, dao) => sum + dao.total_stake, 0).toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total ALGO Staked
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {activeAddress ? daos.filter(dao => dao.is_member).length : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your Memberships
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Container>
    </Box>
  )
}

export default ActiveDAOs

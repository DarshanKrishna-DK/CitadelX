import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Stack,
  ButtonGroup,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material'
import {
  SmartToy,
  Payments,
  Group,
  Schedule,
  CalendarMonth,
  Star,
  Info,
  Security,
  Speed,
  Psychology,
  TrendingUp,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { AIModerator, MODERATOR_CATEGORIES } from '../utils/supabase'

interface ModeratorCardProps {
  moderator: AIModerator
  daoName?: string
  onPurchase?: (moderator: AIModerator, purchaseType: 'hourly' | 'monthly' | 'buyout', amount?: number) => void
  purchasing?: boolean
  showDetailedStats?: boolean
}

const ModeratorCard: React.FC<ModeratorCardProps> = ({
  moderator,
  daoName,
  onPurchase,
  purchasing = false,
  showDetailedStats = false,
}) => {
  const navigate = useNavigate()
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<'hourly' | 'monthly' | 'buyout'>('monthly')

  const categoryInfo = MODERATOR_CATEGORIES[moderator.category as keyof typeof MODERATOR_CATEGORIES]

  const handleViewDetails = () => {
    navigate(`/moderator/${moderator.id}`)
  }

  const handlePurchase = () => {
    if (onPurchase) {
      const amount = selectedPurchaseType === 'hourly' 
        ? moderator.creator_set_hourly_price
        : selectedPurchaseType === 'monthly'
        ? moderator.creator_set_monthly_price
        : moderator.creator_set_buyout_price

      onPurchase(moderator, selectedPurchaseType, amount)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'training':
        return 'warning'
      case 'inactive':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Security />
      case 'training':
        return <Psychology />
      case 'inactive':
        return <Speed />
      default:
        return <SmartToy />
    }
  }

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} ALGO`
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
        },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              mr: 2,
              fontSize: '1.5rem',
            }}
          >
            {categoryInfo?.icon || '🤖'}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h3"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {moderator.name}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1 }}
            >
              {daoName && `${daoName} • `}{categoryInfo?.name || moderator.category}
            </Typography>
            <Chip
              icon={getStatusIcon(moderator.status)}
              label={moderator.status.charAt(0).toUpperCase() + moderator.status.slice(1)}
              size="small"
              color={getStatusColor(moderator.status) as any}
              variant="outlined"
            />
          </Box>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={handleViewDetails}
              sx={{ ml: 1 }}
            >
              <Info />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
          }}
        >
          {moderator.description || categoryInfo?.description || 'AI-powered content moderation'}
        </Typography>

        {/* Training Progress (if in training) */}
        {moderator.status === 'training' && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Training Progress
            </Typography>
            <LinearProgress
              variant="indeterminate"
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}

        {/* Detailed Stats */}
        {showDetailedStats && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingUp fontSize="small" color="primary" />
                <Typography variant="caption">
                  Active
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Group fontSize="small" color="primary" />
                <Typography variant="caption">
                  Multi-platform
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Pricing Section */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Pricing Options
          </Typography>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Schedule fontSize="small" color="action" />
                <Typography variant="body2">Hourly</Typography>
              </Box>
              <Typography variant="body2" fontWeight={500}>
                {formatPrice(moderator.creator_set_hourly_price)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarMonth fontSize="small" color="action" />
                <Typography variant="body2">Monthly</Typography>
              </Box>
              <Typography variant="body2" fontWeight={500}>
                {formatPrice(moderator.creator_set_monthly_price)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Star fontSize="small" color="action" />
                <Typography variant="body2">Buyout</Typography>
              </Box>
              <Typography variant="body2" fontWeight={500}>
                {formatPrice(moderator.creator_set_buyout_price)}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Purchase Type Selection */}
        {onPurchase && moderator.status === 'active' && (
          <Box sx={{ mb: 2 }}>
            <ButtonGroup
              size="small"
              variant="outlined"
              fullWidth
              sx={{ mb: 1 }}
            >
              <Button
                variant={selectedPurchaseType === 'hourly' ? 'contained' : 'outlined'}
                onClick={() => setSelectedPurchaseType('hourly')}
                startIcon={<Schedule />}
              >
                Hourly
              </Button>
              <Button
                variant={selectedPurchaseType === 'monthly' ? 'contained' : 'outlined'}
                onClick={() => setSelectedPurchaseType('monthly')}
                startIcon={<CalendarMonth />}
              >
                Monthly
              </Button>
              <Button
                variant={selectedPurchaseType === 'buyout' ? 'contained' : 'outlined'}
                onClick={() => setSelectedPurchaseType('buyout')}
                startIcon={<Star />}
              >
                Buyout
              </Button>
            </ButtonGroup>
          </Box>
        )}
      </CardContent>

      {/* Action Buttons */}
      <Box sx={{ p: 2, pt: 0 }}>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            fullWidth
            onClick={handleViewDetails}
            startIcon={<Info />}
          >
            Details
          </Button>
          {onPurchase && moderator.status === 'active' && (
            <Button
              variant="contained"
              fullWidth
              onClick={handlePurchase}
              disabled={purchasing}
              startIcon={purchasing ? undefined : <Payments />}
            >
              {purchasing ? 'Processing...' : `Purchase (${formatPrice(
                selectedPurchaseType === 'hourly' 
                  ? moderator.creator_set_hourly_price
                  : selectedPurchaseType === 'monthly'
                  ? moderator.creator_set_monthly_price
                  : moderator.creator_set_buyout_price
              )})`}
            </Button>
          )}
        </Stack>
      </Box>
    </Card>
  )
}

export default ModeratorCard

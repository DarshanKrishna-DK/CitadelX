import React from 'react'
import { Card, CardContent, Typography, Box, Chip, Button, Stack, ButtonGroup } from '@mui/material'
import { SmartToy, Payments, Group, Schedule, CalendarMonth, Star } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { AIModerator } from '../utils/supabase'
import { PurchaseType } from '../services/moderatorPurchaseService'

interface ModeratorCardProps {
  moderator: AIModerator
  daoName?: string
  onPurchase?: (moderator: AIModerator, purchaseType: PurchaseType, amount?: number) => void
  purchasing?: boolean
}

const ModeratorCard: React.FC<ModeratorCardProps> = ({ moderator, daoName, onPurchase, purchasing }) => {
  const navigate = useNavigate()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'training':
        return 'info'
      case 'inactive':
        return 'error'
      default:
        return 'default'
    }
  }

  const getPriceDisplay = () => {
    const prices = []
    if (moderator.monthly_price) prices.push(`${moderator.monthly_price} ALGO/mo`)
    if (moderator.pay_per_use_price) prices.push(`${moderator.pay_per_use_price} ALGO/use`)
    if (moderator.outright_price) prices.push(`${moderator.outright_price} ALGO`)
    return prices.join(' • ')
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
        },
      }}
      onClick={() => navigate(`/moderator/${moderator.id}`)}
    >
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToy sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {moderator.name}
            </Typography>
          </Box>
          <Chip
            label={moderator.status}
            color={getStatusColor(moderator.status) as any}
            size="small"
          />
        </Box>

        {daoName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Group sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              by {daoName}
            </Typography>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 60, flexGrow: 1 }}>
          {moderator.description.length > 100
            ? `${moderator.description.substring(0, 100)}...`
            : moderator.description}
        </Typography>

        <Stack spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Payments sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {getPriceDisplay()}
            </Typography>
          </Box>

          {moderator.nft_asset_id && (
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 500 }}>
              NFT Asset ID: {moderator.nft_asset_id}
            </Typography>
          )}
        </Stack>

        {onPurchase && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
              Purchase Options:
            </Typography>
            <Stack spacing={1}>
              {/* Hourly Purchase */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<Schedule />}
                disabled={purchasing}
                onClick={(e) => {
                  e.stopPropagation()
                  const hours = parseInt(prompt('How many hours?') || '1')
                  if (hours > 0) onPurchase(moderator, PurchaseType.HOURLY, hours)
                }}
                sx={{ justifyContent: 'flex-start' }}
              >
                Hourly ({moderator.creator_set_hourly_price || 0.1} ALGO/hr)
              </Button>

              {/* Monthly Purchase */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<CalendarMonth />}
                disabled={purchasing}
                onClick={(e) => {
                  e.stopPropagation()
                  const months = parseInt(prompt('How many months?') || '1')
                  if (months > 0) onPurchase(moderator, PurchaseType.MONTHLY, months)
                }}
                sx={{ justifyContent: 'flex-start' }}
              >
                Monthly ({moderator.creator_set_monthly_price || 1.0} ALGO/mo)
              </Button>

              {/* Buyout Purchase */}
              <Button
                variant="contained"
                size="small"
                startIcon={<Star />}
                disabled={purchasing}
                onClick={(e) => {
                  e.stopPropagation()
                  const price = moderator.creator_set_buyout_price || 5.0
                  if (confirm(`Buy permanent ownership for ${price} ALGO?`)) {
                    onPurchase(moderator, PurchaseType.BUYOUT, 1)
                  }
                }}
                sx={{ justifyContent: 'flex-start', bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
              >
                Buy Out ({moderator.creator_set_buyout_price || 5.0} ALGO)
              </Button>
            </Stack>
          </Box>
        )}

        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 2 }}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/moderator/${moderator.id}`)
          }}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  )
}

export default ModeratorCard



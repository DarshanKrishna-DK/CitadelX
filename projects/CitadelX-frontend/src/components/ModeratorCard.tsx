import React from 'react'
import { Card, CardContent, Typography, Box, Chip, Button, Stack } from '@mui/material'
import { SmartToy, Payments, Group } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { AIModerator } from '../utils/supabase'

interface ModeratorCardProps {
  moderator: AIModerator
  daoName?: string
}

const ModeratorCard: React.FC<ModeratorCardProps> = ({ moderator, daoName }) => {
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

        <Button
          variant="contained"
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



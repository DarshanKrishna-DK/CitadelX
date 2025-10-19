import React from 'react'
import { Card, CardContent, Typography, Box, Chip, Button } from '@mui/material'
import { People, AccountBalance, CheckCircle } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { DAO } from '../utils/supabase'

interface DAOCardProps {
  dao: DAO
}

const DAOCard: React.FC<DAOCardProps> = ({ dao }) => {
  const navigate = useNavigate()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'pending':
        return 'warning'
      case 'inactive':
        return 'error'
      default:
        return 'default'
    }
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
      onClick={() => navigate(`/dao/${dao.id}`)}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {dao.name}
          </Typography>
          <Chip
            label={dao.status}
            color={getStatusColor(dao.status) as any}
            size="small"
            icon={dao.status === 'active' ? <CheckCircle /> : undefined}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 60 }}>
          {dao.description.length > 120 ? `${dao.description.substring(0, 120)}...` : dao.description}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <People sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              {dao.member_count} members
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccountBalance sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              {dao.treasury_balance.toFixed(2)} ALGO
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          fullWidth
          sx={{
            mt: 'auto',
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
              borderColor: 'primary.light',
              backgroundColor: 'rgba(255, 107, 0, 0.1)',
            },
          }}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/dao/${dao.id}`)
          }}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  )
}

export default DAOCard



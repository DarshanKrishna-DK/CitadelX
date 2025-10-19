import React from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  subtitle?: string
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, subtitle }) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Box
            sx={{
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 107, 0, 0.1)',
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default StatsCard



import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material'
import { ThumbUp, ThumbDown, HowToVote } from '@mui/icons-material'
import { Proposal } from '../utils/supabase'

interface ProposalCardProps {
  proposal: Proposal
  onVote: (proposalId: string, voteType: 'yes' | 'no' | 'abstain') => Promise<void>
  userVotingPower?: number
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onVote, userVotingPower = 0 }) => {
  const [voteDialogOpen, setVoteDialogOpen] = useState(false)
  const [selectedVote, setSelectedVote] = useState<'yes' | 'no' | 'abstain'>('yes')
  const [voting, setVoting] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'info'
      case 'passed':
        return 'success'
      case 'rejected':
        return 'error'
      default:
        return 'default'
    }
  }

  const progressPercentage = (proposal.current_votes / proposal.required_votes) * 100

  const handleVote = async () => {
    try {
      setVoting(true)
      await onVote(proposal.id, selectedVote)
      setVoteDialogOpen(false)
    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setVoting(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {proposal.title}
            </Typography>
            <Chip label={proposal.status} color={getStatusColor(proposal.status) as any} size="small" />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {proposal.description}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {proposal.current_votes} / {proposal.required_votes} votes
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(progressPercentage, 100)}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255, 107, 0, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'primary.main',
                },
              }}
            />
          </Box>

          {proposal.criteria && (
            <Box sx={{ mb: 2, p: 2, backgroundColor: 'rgba(255, 107, 0, 0.05)', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                Proposal Criteria:
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Min Members: {proposal.criteria.minMembers || 'N/A'} •
                Min Stake: {proposal.criteria.minStake || 'N/A'} ALGO •
                Threshold: {proposal.criteria.activationThreshold || 'N/A'}%
              </Typography>
            </Box>
          )}

          {proposal.status === 'active' && userVotingPower > 0 && (
            <Button
              variant="contained"
              fullWidth
              startIcon={<HowToVote />}
              onClick={() => setVoteDialogOpen(true)}
            >
              Cast Your Vote
            </Button>
          )}

          {proposal.status === 'passed' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
              <ThumbUp />
              <Typography variant="body2">Proposal Passed!</Typography>
            </Box>
          )}

          {proposal.status === 'rejected' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
              <ThumbDown />
              <Typography variant="body2">Proposal Rejected</Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={voteDialogOpen} onClose={() => setVoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cast Your Vote</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            You have {userVotingPower} voting power in this DAO
          </Typography>
          <RadioGroup value={selectedVote} onChange={(e) => setSelectedVote(e.target.value as any)}>
            <FormControlLabel value="yes" control={<Radio />} label="Yes - Support this proposal" />
            <FormControlLabel value="no" control={<Radio />} label="No - Reject this proposal" />
            <FormControlLabel value="abstain" control={<Radio />} label="Abstain - Skip voting" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoteDialogOpen(false)} disabled={voting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleVote} disabled={voting}>
            {voting ? 'Submitting...' : 'Submit Vote'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ProposalCard





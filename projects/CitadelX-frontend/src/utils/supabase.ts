import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Database features will not work.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface User {
  id: string
  wallet_address: string
  name?: string
  youtube_channel_id?: string
  youtube_channel_name?: string
  created_at: string
}

export interface DAO {
  id: string
  name: string
  description: string
  category: string
  creator_id: string
  member_count: number
  treasury_balance: number
  min_members: number
  min_stake: number
  voting_period: number
  activation_threshold: number
  status: 'pending' | 'active' | 'inactive'
  blockchain_dao_id?: string
  blockchain_tx_id?: string
  ipfs_hash?: string
  nft_asset_id?: string
  created_at: string
}

export interface DAOMember {
  dao_id: string
  user_id: string
  stake_amount: number
  voting_power: number
  joined_at: string
}

export interface Proposal {
  id: string
  dao_id: string
  title: string
  description: string
  category: string
  context_documents: string[]
  required_votes: number
  current_votes: number
  status: 'pending' | 'active' | 'passed' | 'rejected' | 'executed'
  blockchain_proposal_id?: string
  created_at: string
}

export interface ProposalVote {
  proposal_id: string
  user_id: string
  vote_type: 'yes' | 'no' | 'abstain'
  timestamp: string
}

export interface AIModerator {
  id: string
  dao_id: string
  name: string
  description: string
  category: string
  context_documents: string[]
  nft_asset_id?: number
  nft_metadata_url?: string
  price_model: string[]
  monthly_price?: number
  pay_per_use_price?: number
  outright_price?: number
  status: 'training' | 'active' | 'inactive'
  created_at: string
}

export interface ModeratorPurchase {
  id: string
  moderator_id: string
  user_id: string
  purchase_type: 'monthly' | 'pay_per_use' | 'outright'
  amount_paid: number
  transaction_hash: string
  created_at: string
}

export interface DAORevenue {
  dao_id: string
  total_revenue: number
  last_distribution?: string
  created_at: string
}

// AI Moderator Categories
export const MODERATOR_CATEGORIES = {
  INAPPROPRIATE_CONTENT: {
    id: 'inappropriate_content',
    name: 'Inappropriate Content Detection',
    description: 'Detects and removes inappropriate, offensive, or harmful content',
    icon: '🚫',
  },
  SPAM_DETECTION: {
    id: 'spam_detection',
    name: 'Spam Detection',
    description: 'Identifies and filters spam messages, repetitive content, and bot activity',
    icon: '🛡️',
  },
  AD_MODERATION: {
    id: 'ad_moderation',
    name: 'Advertisement Moderation',
    description: 'Manages promotional content and unauthorized advertising',
    icon: '📢',
  },
  INTERACTION_MODERATOR: {
    id: 'interaction_moderator',
    name: 'Interaction Moderator',
    description: 'Encourages positive interactions and manages community engagement',
    icon: '💬',
  },
  QUERY_MODERATOR: {
    id: 'query_moderator',
    name: 'Query & FAQ Moderator',
    description: 'Answers common questions and provides automated support',
    icon: '❓',
  },
  POLL_MODERATOR: {
    id: 'poll_moderator',
    name: 'Poll & Survey Moderator',
    description: 'Manages polls, surveys, and community voting activities',
    icon: '📊',
  },
  GAMING_MODERATOR: {
    id: 'gaming_moderator',
    name: 'Gaming Community Moderator',
    description: 'Specialized moderation for gaming streams and esports communities',
    icon: '🎮',
  },
  EDUCATIONAL_MODERATOR: {
    id: 'educational_moderator',
    name: 'Educational Content Moderator',
    description: 'Maintains quality in educational streams and learning environments',
    icon: '📚',
  },
} as const

export type ModeratorCategoryId = keyof typeof MODERATOR_CATEGORIES



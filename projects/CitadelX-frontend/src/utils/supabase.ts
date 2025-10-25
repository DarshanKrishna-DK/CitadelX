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
  
  // Blockchain references
  blockchain_dao_id?: string
  blockchain_tx_id?: string
  nft_asset_id?: number          // Changed to number (ASA ID)
  
  // IPFS content (REQUIRED for workflow)
  context_ipfs_hash: string      // Context documents hash
  dao_image_ipfs_hash: string    // DAO/moderator image hash
  
  // Activation criteria
  activation_criteria: 'automatic' | 'manual' | 'voting'
  auto_activation_enabled: boolean
  activation_threshold_met: boolean
  
  created_at: string
  activated_at?: string          // When DAO became active
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
  
  // IPFS content references
  context_ipfs_hash: string      // Context documents hash
  image_ipfs_hash: string        // Moderator image hash (same as DAO image)
  nft_metadata_ipfs_hash: string // Complete NFT metadata hash
  
  // Blockchain references
  nft_asset_id: number           // Algorand ASA ID
  nft_creator_address: string    // NFT creator address
  
  // Creator-set pricing (configurable by DAO creator/owner)
  creator_set_hourly_price: number    // ALGO per hour
  creator_set_monthly_price: number   // ALGO per month
  creator_set_buyout_price: number    // ALGO for permanent ownership
  
  // Legacy pricing fields (for backward compatibility)
  price_model: string[]
  monthly_price?: number
  pay_per_use_price?: number
  outright_price?: number
  status: 'training' | 'active' | 'inactive'
  
  created_at: string
  activated_at?: string
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

export interface DAOActivationCriteria {
  id: string
  dao_id: string
  criteria_type: 'member_count' | 'treasury_balance' | 'time_based' | 'manual'
  criteria_value: number         // e.g., min members, min balance
  is_met: boolean
  checked_at: string
  created_at: string
}

export interface IPFSContent {
  id: string
  ipfs_hash: string
  content_type: 'context_documents' | 'dao_image' | 'nft_metadata'
  file_names: string[]           // Original file names
  file_sizes: number[]           // File sizes in bytes
  upload_status: 'uploading' | 'completed' | 'failed'
  dao_id?: string               // Associated DAO
  moderator_id?: string         // Associated moderator
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



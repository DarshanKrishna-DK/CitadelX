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
  youtube_channel_id?: string
  youtube_channel_name?: string
  created_at: string
}

export interface DAO {
  id: string
  name: string
  description: string
  creator_id: string
  member_count: number
  treasury_balance: number
  status: 'pending' | 'active' | 'inactive'
  created_at: string
}

export interface DAOMember {
  dao_id: string
  user_id: string
  voting_power: number
  joined_at: string
}

export interface Proposal {
  id: string
  dao_id: string
  title: string
  description: string
  criteria: Record<string, any>
  required_votes: number
  current_votes: number
  status: 'pending' | 'active' | 'passed' | 'rejected'
  created_at: string
}

export interface ProposalVote {
  proposal_id: string
  user_id: string
  vote_weight: number
  vote_type: 'yes' | 'no' | 'abstain'
  timestamp: string
}

export interface AIModerator {
  id: string
  dao_id: string
  name: string
  description: string
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



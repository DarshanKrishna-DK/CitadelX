import { supabase, DAO } from './supabase'
import { createModeratorNFT } from './nft'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

export interface ActivationCriteria {
  min_members: number
  min_treasury_balance: number  // in microAlgos
  min_age_hours: number
}

export const DEFAULT_ACTIVATION_CRITERIA: ActivationCriteria = {
  min_members: 1,           // Already met by creator
  min_treasury_balance: 1_000_000,  // 1 ALGO in microAlgos
  min_age_hours: 0,         // Immediate activation for testing
}

/**
 * Check if a DAO meets activation criteria
 */
export async function checkDAOActivationCriteria(daoId: string): Promise<{
  canActivate: boolean
  criteria: {
    memberCount: { required: number; current: number; met: boolean }
    treasuryBalance: { required: number; current: number; met: boolean }
    ageHours: { required: number; current: number; met: boolean }
  }
}> {
  // Get DAO details
  const { data: dao, error: daoError } = await supabase
    .from('daos')
    .select('*')
    .eq('id', daoId)
    .single()

  if (daoError || !dao) {
    throw new Error('DAO not found')
  }

  // Get member count
  const { count: memberCount } = await supabase
    .from('dao_members')
    .select('*', { count: 'exact', head: true })
    .eq('dao_id', daoId)
    .eq('is_active', true)

  // Calculate age in hours
  const createdAt = new Date(dao.created_at)
  const now = new Date()
  const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

  const criteria = DEFAULT_ACTIVATION_CRITERIA
  
  const memberCountMet = (memberCount || 0) >= criteria.min_members
  const treasuryMet = dao.treasury_balance >= criteria.min_treasury_balance
  const ageMet = ageHours >= criteria.min_age_hours

  return {
    canActivate: memberCountMet && treasuryMet && ageMet,
    criteria: {
      memberCount: {
        required: criteria.min_members,
        current: memberCount || 0,
        met: memberCountMet
      },
      treasuryBalance: {
        required: criteria.min_treasury_balance,
        current: dao.treasury_balance,
        met: treasuryMet
      },
      ageHours: {
        required: criteria.min_age_hours,
        current: Math.floor(ageHours * 100) / 100,
        met: ageMet
      }
    }
  }
}

/**
 * Activate a DAO by creating NFT and updating status
 */
export async function activateDAO(
  daoId: string,
  algorand: AlgorandClient,
  creatorAddress: string,
  pricing?: {
    hourlyPrice: number
    monthlyPrice: number
    buyoutPrice: number
  }
): Promise<{ success: boolean; nftAssetId?: number; error?: string }> {
  try {
    // Get DAO details
    const { data: dao, error: daoError } = await supabase
      .from('daos')
      .select('*')
      .eq('id', daoId)
      .single()

    if (daoError || !dao) {
      return { success: false, error: 'DAO not found' }
    }

    // Check if already active
    if (dao.status === 'active') {
      return { success: false, error: 'DAO is already active' }
    }

    // Check activation criteria
    const criteriaCheck = await checkDAOActivationCriteria(daoId)
    if (!criteriaCheck.canActivate) {
      return { 
        success: false, 
        error: 'DAO does not meet activation criteria' 
      }
    }

    // Create NFT metadata using DAO image
    const nftMetadata = {
      name: `${dao.name} AI Moderator`,
      description: dao.description,
      image: `ipfs://${dao.dao_image_ipfs_hash}`,
      properties: {
        category: dao.category,
        dao_id: dao.id,
        context_hash: dao.context_ipfs_hash,
        created_at: new Date().toISOString(),
        moderator_type: 'AI_MODERATOR'
      }
    }

    // Create ASA NFT
    const nftResult = await createModeratorNFT(
      algorand,
      creatorAddress,
      nftMetadata
    )

    // Update DAO status and NFT info
    const { error: updateDAOError } = await supabase
      .from('daos')
      .update({
        status: 'active',
        nft_asset_id: Number(nftResult.assetId),
        activation_threshold_met: true,
        activated_at: new Date().toISOString()
      })
      .eq('id', daoId)

    if (updateDAOError) {
      console.error('Failed to update DAO status:', updateDAOError)
      return { 
        success: false, 
        error: 'NFT created but failed to update DAO status' 
      }
    }

    // Create AI Moderator record
    const { error: moderatorError } = await supabase
      .from('ai_moderators')
      .insert([{
        dao_id: daoId,
        name: dao.name,
        description: dao.description,
        category: dao.category,
        context_ipfs_hash: dao.context_ipfs_hash,
        image_ipfs_hash: dao.dao_image_ipfs_hash,
        nft_metadata_ipfs_hash: '', // Will be updated when metadata is uploaded to IPFS
        nft_asset_id: Number(nftResult.assetId),
        nft_creator_address: creatorAddress,
        // Creator-set pricing
        creator_set_hourly_price: pricing?.hourlyPrice || 0.1,
        creator_set_monthly_price: pricing?.monthlyPrice || 1.0,
        creator_set_buyout_price: pricing?.buyoutPrice || 5.0,
        // Legacy pricing fields
        price_model: ['hourly', 'monthly', 'buyout'],
        monthly_price: pricing?.monthlyPrice || 1.0,
        pay_per_use_price: pricing?.hourlyPrice || 0.1,
        outright_price: pricing?.buyoutPrice || 5.0,
        status: 'active',
        activated_at: new Date().toISOString()
      }])

    if (moderatorError) {
      console.error('Failed to create AI moderator record:', moderatorError)
      // NFT and DAO are created, but moderator record failed
    }

    return {
      success: true,
      nftAssetId: Number(nftResult.assetId)
    }

  } catch (error) {
    console.error('Error activating DAO:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check and activate DAOs that meet criteria (for background processing)
 */
export async function checkAndActivatePendingDAOs(
  algorand: AlgorandClient
): Promise<{ activated: string[]; errors: string[] }> {
  const activated: string[] = []
  const errors: string[] = []

  try {
    // Get all pending DAOs with auto-activation enabled
    const { data: pendingDAOs, error } = await supabase
      .from('daos')
      .select('*')
      .eq('status', 'pending')
      .eq('auto_activation_enabled', true)

    if (error) {
      errors.push(`Failed to fetch pending DAOs: ${error.message}`)
      return { activated, errors }
    }

    // Check each DAO
    for (const dao of pendingDAOs || []) {
      try {
        const criteriaCheck = await checkDAOActivationCriteria(dao.id)
        
        if (criteriaCheck.canActivate) {
          // Get creator address
          const { data: creator } = await supabase
            .from('users')
            .select('wallet_address')
            .eq('id', dao.creator_id)
            .single()

          if (creator?.wallet_address) {
            const result = await activateDAO(
              dao.id,
              algorand,
              creator.wallet_address
            )
            
            if (result.success) {
              activated.push(dao.id)
              console.log(`✅ Activated DAO: ${dao.name} (${dao.id})`)
            } else {
              errors.push(`Failed to activate DAO ${dao.id}: ${result.error}`)
            }
          }
        }
      } catch (daoError) {
        errors.push(`Error processing DAO ${dao.id}: ${daoError}`)
      }
    }

  } catch (globalError) {
    errors.push(`Global error: ${globalError}`)
  }

  return { activated, errors }
}

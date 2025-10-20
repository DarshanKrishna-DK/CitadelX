import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { supabase } from './supabase'
import { createModeratorNFT, ModeratorNFTMetadata } from './nft'
import { getFromIPFS } from './ipfs'

/**
 * Execute a passed proposal by creating the actual NFT and updating database
 */
export async function executeProposal(
  algorand: AlgorandClient,
  proposalId: string,
  executorAddress: string
): Promise<{ success: boolean; assetId?: bigint; txId?: string; error?: string }> {
  try {
    // Get proposal details from database
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        daos (
          id,
          name,
          description,
          category,
          creator_id,
          ipfs_hash,
          users!daos_creator_id_fkey (
            wallet_address
          )
        )
      `)
      .eq('id', proposalId)
      .eq('status', 'passed')
      .single()

    if (proposalError || !proposal) {
      return { success: false, error: 'Proposal not found or not in passed state' }
    }

    const dao = proposal.daos
    if (!dao) {
      return { success: false, error: 'DAO not found' }
    }

    // Get context documents from IPFS
    let contextDocuments = ''
    if (dao.ipfs_hash) {
      try {
        contextDocuments = await getFromIPFS(dao.ipfs_hash)
      } catch (error) {
        console.warn('Could not retrieve context documents from IPFS:', error)
        contextDocuments = 'Context documents stored on IPFS'
      }
    }

    // Create NFT metadata
    const metadata: ModeratorNFTMetadata = {
      name: `${dao.name} AI Moderator`,
      description: `${dao.description}\n\nContext: ${contextDocuments}`,
      properties: {
        category: dao.category,
        dao_id: dao.id,
        creator: dao.users?.wallet_address || 'Unknown',
        ipfs_hash: dao.ipfs_hash || '',
        created_at: new Date().toISOString(),
        moderator_type: proposal.category,
      }
    }

    // Create the actual NFT
    const nftResult = await createModeratorNFT(
      algorand,
      executorAddress,
      metadata
    )

    // Update proposal status to executed
    const { error: updateProposalError } = await supabase
      .from('proposals')
      .update({ 
        status: 'executed',
        blockchain_proposal_id: nftResult.txId
      })
      .eq('id', proposalId)

    if (updateProposalError) {
      console.error('Failed to update proposal status:', updateProposalError)
      // NFT was created but database update failed
      return { 
        success: true, 
        assetId: nftResult.assetId, 
        txId: nftResult.txId,
        error: 'NFT created but database update failed'
      }
    }

    // Update DAO with NFT asset ID and mark as active
    const { error: updateDAOError } = await supabase
      .from('daos')
      .update({ 
        nft_asset_id: nftResult.assetId.toString(),
        status: 'active'
      })
      .eq('id', dao.id)

    if (updateDAOError) {
      console.error('Failed to update DAO with NFT asset ID:', updateDAOError)
    }

    // Create AI moderator record
    const { error: moderatorError } = await supabase
      .from('ai_moderators')
      .insert([{
        dao_id: dao.id,
        name: metadata.name,
        description: metadata.description,
        category: dao.category,
        nft_asset_id: nftResult.assetId.toString(),
        status: 'active',
        monthly_price: 10.0, // Default pricing - can be updated later
        pay_per_use_price: 0.01,
        outright_price: 100.0,
      }])

    if (moderatorError) {
      console.error('Failed to create AI moderator record:', moderatorError)
    }

    return {
      success: true,
      assetId: nftResult.assetId,
      txId: nftResult.txId
    }

  } catch (error) {
    console.error('Error executing proposal:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Check if a proposal can be executed (has enough votes and is in passed state)
 */
export async function canExecuteProposal(proposalId: string): Promise<boolean> {
  try {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('status, current_votes, required_votes')
      .eq('id', proposalId)
      .single()

    if (error || !proposal) {
      return false
    }

    return proposal.status === 'passed' && 
           proposal.current_votes >= proposal.required_votes
  } catch (error) {
    console.error('Error checking proposal execution status:', error)
    return false
  }
}

/**
 * Get execution status of a proposal
 */
export async function getProposalExecutionStatus(proposalId: string): Promise<{
  canExecute: boolean
  isExecuted: boolean
  assetId?: string
  txId?: string
}> {
  try {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select(`
        status,
        current_votes,
        required_votes,
        blockchain_proposal_id,
        daos (nft_asset_id)
      `)
      .eq('id', proposalId)
      .single()

    if (error || !proposal) {
      return { canExecute: false, isExecuted: false }
    }

    const isExecuted = proposal.status === 'executed'
    const canExecute = proposal.status === 'passed' && 
                      proposal.current_votes >= proposal.required_votes &&
                      !isExecuted

    return {
      canExecute,
      isExecuted,
      assetId: proposal.daos?.nft_asset_id,
      txId: proposal.blockchain_proposal_id
    }
  } catch (error) {
    console.error('Error getting proposal execution status:', error)
    return { canExecute: false, isExecuted: false }
  }
}

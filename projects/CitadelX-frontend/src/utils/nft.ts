import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { uploadMetadata } from './ipfs'

export interface ModeratorNFTMetadata {
  name: string
  description: string
  image?: string
  properties: {
    category: string
    dao_id: string
    creator: string
    ipfs_hash: string
    created_at: string
    moderator_type: string
  }
}

/**
 * Create an ASA (NFT) for an AI moderator
 */
export async function createModeratorNFT(
  algorand: AlgorandClient,
  creator: string,
  metadata: ModeratorNFTMetadata
): Promise<{ assetId: bigint; txId: string }> {
  try {
    // Upload metadata to IPFS
    const metadataResult = await uploadMetadata(metadata)
    
    // Create metadata hash from the IPFS hash
    const encoder = new TextEncoder()
    const metadataBytes = encoder.encode(metadataResult.hash)
    const metadataHash = new Uint8Array(32)
    metadataHash.set(metadataBytes.slice(0, 32))
    
    // Create ASA transaction with proper parameters
    const assetCreateResult = await algorand.send.assetCreate({
      sender: creator,
      assetName: metadata.name,
      unitName: 'CITMOD',
      total: 1n, // NFT - only 1 unit
      decimals: 0, // NFT - no decimals
      defaultFrozen: false,
      url: metadataResult.url,
      metadataHash: metadataHash,
      manager: creator,
      reserve: creator,
      freeze: creator,
      clawback: creator,
    })
    
    // Get the created asset ID from the result
    const assetId = assetCreateResult.assetId
    
    return {
      assetId,
      txId: assetCreateResult.txIds[0],
    }
  } catch (error) {
    console.error('Error creating moderator NFT:', error)
    throw new Error('Failed to create moderator NFT')
  }
}

/**
 * Transfer NFT ownership
 */
export async function transferNFT(
  algorand: AlgorandClient,
  assetId: bigint,
  from: string,
  to: string,
  amount: bigint = 1n
): Promise<string> {
  try {
    // Create asset transfer transaction
    const transferResult = await algorand.send.assetTransfer({
      sender: from,
      receiver: to,
      assetId: assetId,
      amount: amount,
    })
    
    return transferResult.txIds[0]
  } catch (error) {
    console.error('Error transferring NFT:', error)
    throw new Error('Failed to transfer NFT')
  }
}

/**
 * Get NFT information
 */
export async function getNFTInfo(
  algorand: AlgorandClient,
  assetId: bigint
): Promise<any> {
  try {
    const assetInfo = await algorand.client.algod.getAssetByID(Number(assetId)).do()
    return assetInfo
  } catch (error) {
    console.error('Error getting NFT info:', error)
    throw new Error('Failed to get NFT information')
  }
}

/**
 * Check if address owns NFT
 */
export async function checkNFTOwnership(
  algorand: AlgorandClient,
  address: string,
  assetId: bigint
): Promise<boolean> {
  try {
    const accountInfo = await algorand.client.algod.accountInformation(address).do()
    const asset = accountInfo.assets?.find((a: any) => a['asset-id'] === Number(assetId))
    return asset && asset.amount > 0
  } catch (error) {
    console.error('Error checking NFT ownership:', error)
    return false
  }
}

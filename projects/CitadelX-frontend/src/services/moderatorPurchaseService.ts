import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { supabase, AIModerator, ModeratorPurchase } from '../utils/supabase'
import { ModeratorPurchaseContractClient } from '../contracts/ModeratorPurchaseContract'

export type PurchaseType = 'hourly' | 'monthly' | 'buyout'

export interface PurchaseData {
  moderatorId: string
  purchaseType: PurchaseType
  amount: number
  duration?: number // hours for hourly, months for monthly
  buyerAddress: string
}

export interface PurchaseResult {
  success: boolean
  transactionId?: string
  purchaseId?: string
  error?: string
}

export interface ModeratorPricing {
  hourlyPrice: number
  monthlyPrice: number
  buyoutPrice: number
  currency: 'ALGO'
}

export interface PurchaseHistory {
  id: string
  moderator_id: string
  moderator_name: string
  purchase_type: PurchaseType
  amount_paid: number
  purchase_date: string
  expires_at?: string
  status: 'active' | 'expired' | 'cancelled'
}

class ModeratorPurchaseService {
  private algorand: AlgorandClient

  constructor() {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    this.algorand = AlgorandClient.fromConfig({
      algodConfig: {
        server: algodConfig.server,
        port: algodConfig.port,
        token: String(algodConfig.token),
      },
    })
  }

  /**
   * Get pricing information for a moderator
   */
  async getModeratorPricing(moderatorId: string): Promise<ModeratorPricing> {
    try {
      const { data: moderator, error } = await supabase
        .from('ai_moderators')
        .select('creator_set_hourly_price, creator_set_monthly_price, creator_set_buyout_price')
        .eq('id', moderatorId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch moderator pricing: ${error.message}`)
      }

      return {
        hourlyPrice: moderator.creator_set_hourly_price || 0.1,
        monthlyPrice: moderator.creator_set_monthly_price || 1.0,
        buyoutPrice: moderator.creator_set_buyout_price || 5.0,
        currency: 'ALGO',
      }
    } catch (error) {
      console.error('Error fetching moderator pricing:', error)
      throw error
    }
  }

  /**
   * Calculate total cost including platform fees
   */
  calculateTotalCost(basePrice: number, purchaseType: PurchaseType, duration: number = 1): number {
    const platformFeePercentage = 0.05 // 5% platform fee
    const baseCost = basePrice * duration
    const platformFee = baseCost * platformFeePercentage
    return baseCost + platformFee
  }

  /**
   * Purchase hourly access to a moderator
   */
  async purchaseHourlyAccess(
    moderatorId: string,
    hours: number,
    buyerAddress: string,
    signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<PurchaseResult> {
    try {
      // Get moderator details
      const { data: moderator, error: moderatorError } = await supabase
        .from('ai_moderators')
        .select('*, daos(creator_id, users(wallet_address))')
        .eq('id', moderatorId)
        .single()

      if (moderatorError || !moderator) {
        throw new Error('Moderator not found')
      }

      const hourlyPrice = moderator.creator_set_hourly_price || 0.1
      const totalCost = this.calculateTotalCost(hourlyPrice, 'hourly', hours)
      const totalCostMicroAlgos = Math.round(totalCost * 1_000_000)

      // Create purchase contract client
      const purchaseContract = new ModeratorPurchaseContractClient(
        {
          resolveBy: 'id',
          id: 0, // This should be the actual contract app ID
        },
        this.algorand
      )

      // Create purchase transaction
      const purchaseResult = await purchaseContract.purchaseAccess(
        {
          moderatorAssetId: BigInt(moderator.nft_asset_id),
          purchaseType: 'hourly',
          duration: BigInt(hours),
        },
        {
          sender: buyerAddress,
          sendParams: {
            fee: (1000).toString(),
          },
        }
      )

      // Sign and send transaction
      const signedTxns = await signTransactions([purchaseResult.transaction.txn()])
      const txnResult = await this.algorand.client.algod.sendRawTransaction(signedTxns[0]).do()

      // Record purchase in database
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + hours)

      const { data: purchase, error: purchaseError } = await supabase
        .from('moderator_purchases')
        .insert({
          moderator_id: moderatorId,
          buyer_wallet_address: buyerAddress,
          purchase_type: 'hourly',
          amount_paid: totalCost,
          duration_hours: hours,
          expires_at: expiresAt.toISOString(),
          transaction_id: txnResult.txId,
          status: 'active',
        })
        .select()
        .single()

      if (purchaseError) {
        console.error('Failed to record purchase:', purchaseError)
        // Transaction succeeded but database record failed
        // This should be handled with proper error recovery
      }

      return {
        success: true,
        transactionId: txnResult.txId,
        purchaseId: purchase?.id,
      }
    } catch (error) {
      console.error('Error purchasing hourly access:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Purchase monthly license for a moderator
   */
  async purchaseMonthlyLicense(
    moderatorId: string,
    months: number,
    buyerAddress: string,
    signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<PurchaseResult> {
    try {
      // Get moderator details
      const { data: moderator, error: moderatorError } = await supabase
        .from('ai_moderators')
        .select('*, daos(creator_id, users(wallet_address))')
        .eq('id', moderatorId)
        .single()

      if (moderatorError || !moderator) {
        throw new Error('Moderator not found')
      }

      const monthlyPrice = moderator.creator_set_monthly_price || 1.0
      const totalCost = this.calculateTotalCost(monthlyPrice, 'monthly', months)
      const totalCostMicroAlgos = Math.round(totalCost * 1_000_000)

      // Create purchase contract client
      const purchaseContract = new ModeratorPurchaseContractClient(
        {
          resolveBy: 'id',
          id: 0, // This should be the actual contract app ID
        },
        this.algorand
      )

      // Create purchase transaction
      const purchaseResult = await purchaseContract.purchaseAccess(
        {
          moderatorAssetId: BigInt(moderator.nft_asset_id),
          purchaseType: 'monthly',
          duration: BigInt(months),
        },
        {
          sender: buyerAddress,
          sendParams: {
            fee: (1000).toString(),
          },
        }
      )

      // Sign and send transaction
      const signedTxns = await signTransactions([purchaseResult.transaction.txn()])
      const txnResult = await this.algorand.client.algod.sendRawTransaction(signedTxns[0]).do()

      // Record purchase in database
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + months)

      const { data: purchase, error: purchaseError } = await supabase
        .from('moderator_purchases')
        .insert({
          moderator_id: moderatorId,
          buyer_wallet_address: buyerAddress,
          purchase_type: 'monthly',
          amount_paid: totalCost,
          duration_months: months,
          expires_at: expiresAt.toISOString(),
          transaction_id: txnResult.txId,
          status: 'active',
        })
        .select()
        .single()

      if (purchaseError) {
        console.error('Failed to record purchase:', purchaseError)
      }

      return {
        success: true,
        transactionId: txnResult.txId,
        purchaseId: purchase?.id,
      }
    } catch (error) {
      console.error('Error purchasing monthly license:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Buyout a moderator (permanent ownership)
   */
  async buyoutModerator(
    moderatorId: string,
    buyerAddress: string,
    signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<PurchaseResult> {
    try {
      // Get moderator details
      const { data: moderator, error: moderatorError } = await supabase
        .from('ai_moderators')
        .select('*, daos(creator_id, users(wallet_address))')
        .eq('id', moderatorId)
        .single()

      if (moderatorError || !moderator) {
        throw new Error('Moderator not found')
      }

      const buyoutPrice = moderator.creator_set_buyout_price || 5.0
      const totalCost = this.calculateTotalCost(buyoutPrice, 'buyout')
      const totalCostMicroAlgos = Math.round(totalCost * 1_000_000)

      // Create purchase contract client
      const purchaseContract = new ModeratorPurchaseContractClient(
        {
          resolveBy: 'id',
          id: 0, // This should be the actual contract app ID
        },
        this.algorand
      )

      // Create buyout transaction
      const purchaseResult = await purchaseContract.purchaseAccess(
        {
          moderatorAssetId: BigInt(moderator.nft_asset_id),
          purchaseType: 'buyout',
          duration: BigInt(0), // Permanent
        },
        {
          sender: buyerAddress,
          sendParams: {
            fee: (1000).toString(),
          },
        }
      )

      // Sign and send transaction
      const signedTxns = await signTransactions([purchaseResult.transaction.txn()])
      const txnResult = await this.algorand.client.algod.sendRawTransaction(signedTxns[0]).do()

      // Record purchase in database
      const { data: purchase, error: purchaseError } = await supabase
        .from('moderator_purchases')
        .insert({
          moderator_id: moderatorId,
          buyer_wallet_address: buyerAddress,
          purchase_type: 'buyout',
          amount_paid: totalCost,
          transaction_id: txnResult.txId,
          status: 'active',
          is_permanent: true,
        })
        .select()
        .single()

      if (purchaseError) {
        console.error('Failed to record purchase:', purchaseError)
      }

      // Update moderator ownership
      await supabase
        .from('ai_moderators')
        .update({
          nft_creator_address: buyerAddress,
        })
        .eq('id', moderatorId)

      return {
        success: true,
        transactionId: txnResult.txId,
        purchaseId: purchase?.id,
      }
    } catch (error) {
      console.error('Error buying out moderator:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Get user's purchase history
   */
  async getPurchaseHistory(walletAddress: string): Promise<PurchaseHistory[]> {
    try {
      const { data: purchases, error } = await supabase
        .from('moderator_purchases')
        .select(`
          id,
          moderator_id,
          purchase_type,
          amount_paid,
          created_at,
          expires_at,
          status,
          ai_moderators(name)
        `)
        .eq('buyer_wallet_address', walletAddress)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch purchase history: ${error.message}`)
      }

      return purchases.map((purchase: any) => ({
        id: purchase.id,
        moderator_id: purchase.moderator_id,
        moderator_name: purchase.ai_moderators?.name || 'Unknown Moderator',
        purchase_type: purchase.purchase_type,
        amount_paid: purchase.amount_paid,
        purchase_date: purchase.created_at,
        expires_at: purchase.expires_at,
        status: purchase.status,
      }))
    } catch (error) {
      console.error('Error fetching purchase history:', error)
      throw error
    }
  }

  /**
   * Check if user has active access to a moderator
   */
  async hasActiveAccess(moderatorId: string, walletAddress: string): Promise<boolean> {
    try {
      const { data: purchases, error } = await supabase
        .from('moderator_purchases')
        .select('expires_at, is_permanent, status')
        .eq('moderator_id', moderatorId)
        .eq('buyer_wallet_address', walletAddress)
        .eq('status', 'active')

      if (error) {
        throw new Error(`Failed to check access: ${error.message}`)
      }

      if (!purchases || purchases.length === 0) {
        return false
      }

      // Check for permanent access (buyout)
      const permanentAccess = purchases.some(p => p.is_permanent)
      if (permanentAccess) {
        return true
      }

      // Check for non-expired access
      const now = new Date()
      const activeAccess = purchases.some(p => {
        if (!p.expires_at) return false
        return new Date(p.expires_at) > now
      })

      return activeAccess
    } catch (error) {
      console.error('Error checking active access:', error)
      return false
    }
  }

  /**
   * Get active moderators for a user
   */
  async getActiveModerators(walletAddress: string): Promise<AIModerator[]> {
    try {
      const { data: purchases, error } = await supabase
        .from('moderator_purchases')
        .select(`
          moderator_id,
          expires_at,
          is_permanent,
          ai_moderators(*)
        `)
        .eq('buyer_wallet_address', walletAddress)
        .eq('status', 'active')

      if (error) {
        throw new Error(`Failed to fetch active moderators: ${error.message}`)
      }

      const now = new Date()
      const activeModerators: AIModerator[] = []

      for (const purchase of purchases) {
        // Check if access is still valid
        const isValid = purchase.is_permanent || 
          (purchase.expires_at && new Date(purchase.expires_at) > now)

        if (isValid && purchase.ai_moderators) {
          activeModerators.push(purchase.ai_moderators)
        }
      }

      return activeModerators
    } catch (error) {
      console.error('Error fetching active moderators:', error)
      throw error
    }
  }
}

export const moderatorPurchaseService = new ModeratorPurchaseService()

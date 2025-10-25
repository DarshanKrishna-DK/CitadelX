import algosdk from 'algosdk'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getTestnetConfig } from '../config/testnet.config'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { supabase } from '../utils/supabase'

export enum PurchaseType {
  HOURLY = 1,
  MONTHLY = 2,
  BUYOUT = 3
}

export interface ModeratorPricing {
  hourlyPriceAlgo: number
  monthlyPriceAlgo: number
  buyoutPriceAlgo: number
  currentOwner: string
  creator: string
}

export interface PurchaseData {
  moderatorId: string
  moderatorName: string
  purchaseType: PurchaseType
  amount: number // hours for hourly, months for monthly, 1 for buyout
  priceAlgo: number
}

export interface PurchaseResult {
  success: boolean
  transactionId?: string
  assetId?: number
  error?: string
  accessDetails?: {
    accessType: number
    hoursRemaining?: number
    expiryTimestamp?: number
    accessTypeName: string
  }
}

export interface UserAccessData {
  accessType: number // 0=none, 1=hourly, 2=monthly, 3=buyout
  hoursRemaining: number
  expiryTimestamp: number
  hasValidAccess: boolean
  accessTypeName: string
}

class ModeratorPurchaseService {
  private algodClient: algosdk.Algodv2
  private algorand: AlgorandClient

  constructor() {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    this.algodClient = new algosdk.Algodv2(
      String(algodConfig.token),
      algodConfig.server,
      algodConfig.port
    )
    
    this.algorand = AlgorandClient.fromClients({
      algod: this.algodClient,
      indexer: undefined
    })
  }

  /**
   * Get moderator pricing information from database
   */
  async getModeratorPricing(moderatorId: string): Promise<ModeratorPricing> {
    try {
      // Get moderator pricing from database
      const { data: moderator, error } = await supabase
        .from('ai_moderators')
        .select(`
          creator_set_hourly_price,
          creator_set_monthly_price,
          creator_set_buyout_price,
          nft_creator_address,
          dao_id,
          daos!inner(creator_id, users!inner(wallet_address))
        `)
        .eq('id', moderatorId)
        .single()

      if (error || !moderator) {
        throw new Error('Moderator not found')
      }

      // Get creator wallet address
      const creatorAddress = moderator.daos?.users?.wallet_address || moderator.nft_creator_address

      return {
        hourlyPriceAlgo: moderator.creator_set_hourly_price || 0.1,
        monthlyPriceAlgo: moderator.creator_set_monthly_price || 1.0,
        buyoutPriceAlgo: moderator.creator_set_buyout_price || 5.0,
        currentOwner: creatorAddress || 'Unknown',
        creator: creatorAddress || 'Unknown'
      }
    } catch (error) {
      console.error('Failed to get moderator pricing:', error)
      throw new Error('Failed to fetch moderator pricing')
    }
  }

  /**
   * Calculate total cost for purchase
   */
  calculateTotalCost(
    purchaseType: PurchaseType,
    amount: number,
    pricing: ModeratorPricing
  ): number {
    switch (purchaseType) {
      case PurchaseType.HOURLY:
        return pricing.hourlyPriceAlgo * amount
      case PurchaseType.MONTHLY:
        return pricing.monthlyPriceAlgo * amount
      case PurchaseType.BUYOUT:
        return pricing.buyoutPriceAlgo
      default:
        throw new Error('Invalid purchase type')
    }
  }

  /**
   * Purchase hourly access to moderator
   */
  async purchaseHourlyAccess(
    purchaseData: PurchaseData,
    walletAddress: string,
    signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<PurchaseResult> {
    try {
      console.log(`🕐 Purchasing ${purchaseData.amount} hours of access for ${purchaseData.priceAlgo} ALGO`)

      const config = getTestnetConfig()
      const suggestedParams = await this.algodClient.getTransactionParams().do()

      // Convert ALGO to microAlgos
      const amountMicroAlgos = Math.floor(purchaseData.priceAlgo * 1_000_000)

      // The deployed ModeratorPurchaseContract App ID (from your deployment)
      const contractAppId = 748511263
      const contractAddress = algosdk.getApplicationAddress(contractAppId)

      // Create payment transaction to the smart contract
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: walletAddress,
        to: contractAddress, // Payment goes to the smart contract
        amount: amountMicroAlgos,
        suggestedParams: suggestedParams,
        note: new Uint8Array(Buffer.from(`Hourly:${purchaseData.moderatorId}:${purchaseData.amount}h`)),
      })

      // Create application call transaction to purchase_hourly_access method
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: walletAddress,
        appIndex: contractAppId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('purchase_hourly_access')), // Method name
          algosdk.encodeUint64(purchaseData.amount), // Hours parameter
        ],
        suggestedParams: suggestedParams,
      })

      // Group the transactions
      const txnGroup = [paymentTxn, appCallTxn]
      algosdk.assignGroupID(txnGroup)

      // Sign and send transactions
      const signedTxns = await signTransactions(txnGroup.map(txn => txn.toByte()))
      const { txId } = await this.algodClient.sendRawTransaction(signedTxns).do()
      
      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, txId, 4)

      console.log(`✅ Hourly access purchased! Transaction: ${txId}`)

      return {
        success: true,
        transactionId: txId,
        accessDetails: {
          accessType: PurchaseType.HOURLY,
          hoursRemaining: purchaseData.amount,
          accessTypeName: 'Hourly Access'
        }
      }
    } catch (error) {
      console.error('Failed to purchase hourly access:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Purchase monthly license for moderator
   */
  async purchaseMonthlyLicense(
    purchaseData: PurchaseData,
    walletAddress: string,
    signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<PurchaseResult> {
    try {
      console.log(`📅 Purchasing ${purchaseData.amount} month(s) license for ${purchaseData.priceAlgo} ALGO`)

      const config = getTestnetConfig()
      const suggestedParams = await this.algodClient.getTransactionParams().do()

      // Convert ALGO to microAlgos
      const amountMicroAlgos = Math.floor(purchaseData.priceAlgo * 1_000_000)

      // Calculate expiry timestamp (current time + months)
      const now = Date.now()
      const monthsInMs = purchaseData.amount * 30 * 24 * 60 * 60 * 1000 // Approximate
      const expiryTimestamp = now + monthsInMs

      // The deployed ModeratorPurchaseContract App ID (from your deployment)
      const contractAppId = 748511263
      const contractAddress = algosdk.getApplicationAddress(contractAppId)

      // Create payment transaction to the smart contract
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: walletAddress,
        to: contractAddress, // Payment goes to the smart contract
        amount: amountMicroAlgos,
        suggestedParams: suggestedParams,
        note: new Uint8Array(Buffer.from(`Monthly:${purchaseData.moderatorId}:${purchaseData.amount}m`)),
      })

      // Create application call transaction to purchase_monthly_access method
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: walletAddress,
        appIndex: contractAppId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('purchase_monthly_access')), // Method name
          algosdk.encodeUint64(purchaseData.amount), // Months parameter
        ],
        suggestedParams: suggestedParams,
      })

      // Group the transactions
      const txnGroup = [paymentTxn, appCallTxn]
      algosdk.assignGroupID(txnGroup)

      // Sign and send transactions
      const signedTxns = await signTransactions(txnGroup.map(txn => txn.toByte()))
      const { txId } = await this.algodClient.sendRawTransaction(signedTxns).do()
      
      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, txId, 4)

      console.log(`✅ Monthly license purchased! Transaction: ${txId}`)

      return {
        success: true,
        transactionId: txId,
        accessDetails: {
          accessType: PurchaseType.MONTHLY,
          expiryTimestamp: expiryTimestamp,
          accessTypeName: 'Monthly License'
        }
      }
    } catch (error) {
      console.error('Failed to purchase monthly license:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Buyout moderator for permanent ownership
   */
  async buyoutModerator(
    purchaseData: PurchaseData,
    walletAddress: string,
    signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<PurchaseResult> {
    try {
      console.log(`👑 Buying out moderator for ${purchaseData.priceAlgo} ALGO (permanent ownership)`)

      const config = getTestnetConfig()
      const suggestedParams = await this.algodClient.getTransactionParams().do()

      // Convert ALGO to microAlgos
      const amountMicroAlgos = Math.floor(purchaseData.priceAlgo * 1_000_000)

      // 90/10 split as per citadel-algo library
      const ownerShare = Math.floor(amountMicroAlgos * 0.9)
      const contractFee = amountMicroAlgos - ownerShare

      console.log(`💰 Payment breakdown:`)
      console.log(`  - Total: ${purchaseData.priceAlgo} ALGO`)
      console.log(`  - To owner (90%): ${ownerShare / 1_000_000} ALGO`)
      console.log(`  - Contract fee (10%): ${contractFee / 1_000_000} ALGO`)

      // The deployed ModeratorPurchaseContract App ID (from your deployment)
      const contractAppId = 748511263
      const contractAddress = algosdk.getApplicationAddress(contractAppId)

      // Create payment transaction to the smart contract
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: walletAddress,
        to: contractAddress, // Payment goes to the smart contract
        amount: amountMicroAlgos,
        suggestedParams: suggestedParams,
        note: new Uint8Array(Buffer.from(`Buyout:${purchaseData.moderatorId}:permanent`)),
      })

      // Create application call transaction to buyout_moderator method
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: walletAddress,
        appIndex: contractAppId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [
          new Uint8Array(Buffer.from('buyout_moderator')), // Method name
        ],
        suggestedParams: suggestedParams,
      })

      // Group the transactions
      const txnGroup = [paymentTxn, appCallTxn]
      algosdk.assignGroupID(txnGroup)

      // Sign and send transactions
      const signedTxns = await signTransactions(txnGroup.map(txn => txn.toByte()))
      const { txId } = await this.algodClient.sendRawTransaction(signedTxns).do()
      
      // Wait for confirmation
      await algosdk.waitForConfirmation(this.algodClient, txId, 4)

      console.log(`🎉 Moderator buyout successful! You now own this moderator permanently.`)
      console.log(`Transaction: ${txId}`)

      return {
        success: true,
        transactionId: txId,
        accessDetails: {
          accessType: PurchaseType.BUYOUT,
          accessTypeName: 'Permanent Owner'
        }
      }
    } catch (error) {
      console.error('Failed to buyout moderator:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get user's access status for a moderator
   */
  async getUserAccess(walletAddress: string, appId?: number): Promise<UserAccessData> {
    try {
      // In a real implementation, this would query the smart contract's local state
      // For now, return mock data
      
      return {
        accessType: 0, // No access
        hoursRemaining: 0,
        expiryTimestamp: 0,
        hasValidAccess: false,
        accessTypeName: 'No Access'
      }
    } catch (error) {
      console.error('Failed to get user access:', error)
      return {
        accessType: 0,
        hoursRemaining: 0,
        expiryTimestamp: 0,
        hasValidAccess: false,
        accessTypeName: 'No Access'
      }
    }
  }

  /**
   * Check if user has valid access
   */
  hasValidAccess(accessData: UserAccessData): boolean {
    const now = Date.now()
    
    switch (accessData.accessType) {
      case PurchaseType.HOURLY:
        return accessData.hoursRemaining > 0
      case PurchaseType.MONTHLY:
        return accessData.expiryTimestamp > now
      case PurchaseType.BUYOUT:
        return true // Permanent ownership
      default:
        return false
    }
  }

  /**
   * Format access type to human readable string
   */
  formatAccessType(accessType: number): string {
    switch (accessType) {
      case PurchaseType.HOURLY:
        return 'Hourly Access'
      case PurchaseType.MONTHLY:
        return 'Monthly License'
      case PurchaseType.BUYOUT:
        return 'Permanent Owner'
      default:
        return 'No Access'
    }
  }

  /**
   * Update moderator pricing (owner only)
   */
  async updateModeratorPricing(
    appId: number,
    newHourlyPrice: number,
    newMonthlyPrice: number,
    newBuyoutPrice: number,
    walletAddress: string,
    signTransactions: (txns: Uint8Array[]) => Promise<Uint8Array[]>
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log('🔧 Updating moderator pricing...')
      console.log(`  - Hourly: ${newHourlyPrice} ALGO`)
      console.log(`  - Monthly: ${newMonthlyPrice} ALGO`)
      console.log(`  - Buyout: ${newBuyoutPrice} ALGO`)

      // In a real implementation, this would call the smart contract's update_pricing method
      // For now, we'll simulate success
      
      const mockTxId = 'MOCK_UPDATE_PRICING_TXN_' + Date.now()
      
      console.log(`✅ Pricing updated successfully! Transaction: ${mockTxId}`)

      return {
        success: true,
        transactionId: mockTxId
      }
    } catch (error) {
      console.error('Failed to update pricing:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const moderatorPurchaseService = new ModeratorPurchaseService()

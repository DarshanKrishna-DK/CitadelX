import { WalletManager, WalletId, SupportedWallet } from '@txnlab/use-wallet-react'
import { getTestnetConfig } from '../config/testnet.config'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './network/getAlgoClientConfigs'

/**
 * Enhanced Wallet Manager based on Algorand DAO Template best practices
 * Handles wallet connection, validation, and network configuration
 */

export interface WalletConnectionState {
  isConnected: boolean
  address: string | null
  network: string
  error: string | null
}

export class CitadelWalletManager {
  private walletManager: WalletManager
  private config: ReturnType<typeof getTestnetConfig>

  constructor() {
    this.config = getTestnetConfig()
    this.walletManager = this.createWalletManager()
  }

  private createWalletManager(): WalletManager {
    let supportedWallets: SupportedWallet[]
    let algodConfig

    try {
      algodConfig = getAlgodConfigFromViteEnvironment()
    } catch {
      // Fallback to testnet config if environment variables are not set
      algodConfig = this.config.algod
    }

    if (algodConfig.network === 'localnet') {
      try {
        const kmdConfig = getKmdConfigFromViteEnvironment()
        supportedWallets = [
          {
            id: WalletId.KMD,
            options: {
              baseServer: kmdConfig.server,
              token: String(kmdConfig.token),
              port: String(kmdConfig.port),
            },
          },
        ]
      } catch {
        // Fallback to testnet wallets if KMD config fails
        supportedWallets = this.getTestnetWallets()
      }
    } else {
      supportedWallets = this.getTestnetWallets()
    }

    return new WalletManager({
      wallets: supportedWallets,
      defaultNetwork: algodConfig.network || 'testnet',
      networks: {
        [algodConfig.network || 'testnet']: {
          algod: {
            baseServer: algodConfig.server,
            port: algodConfig.port,
            token: String(algodConfig.token),
          },
        },
      },
      options: {
        resetNetwork: true,
      },
    })
  }

  private getTestnetWallets(): SupportedWallet[] {
    return [
      { id: WalletId.PERA },
      { id: WalletId.DEFLY },
      { id: WalletId.EXODUS },
    ]
  }

  public getManager(): WalletManager {
    return this.walletManager
  }

  /**
   * Validate wallet address format
   */
  public static validateAddress(address: string | null): boolean {
    if (!address) return false
    
    // Basic validation: Algorand addresses are 58 characters long
    // More lenient validation to avoid blocking valid addresses
    return address.length === 58 && typeof address === 'string'
  }

  /**
   * Get wallet connection state with validation
   */
  public static getConnectionState(activeAddress: string | null, isReady: boolean): WalletConnectionState {
    return {
      isConnected: isReady && this.validateAddress(activeAddress),
      address: activeAddress,
      network: getTestnetConfig().algod.network,
      error: null
    }
  }

  /**
   * Handle wallet connection errors gracefully
   */
  public static handleConnectionError(error: any): string {
    console.error('Wallet connection error:', error)
    
    if (error?.message?.includes('User rejected')) {
      return 'Connection cancelled by user'
    }
    
    if (error?.message?.includes('network')) {
      return 'Network connection error. Please check your internet connection.'
    }
    
    if (error?.message?.includes('not found')) {
      return 'Wallet not found. Please install a supported wallet extension.'
    }
    
    return 'Failed to connect wallet. Please try again.'
  }
}

// Export singleton instance
export const citadelWalletManager = new CitadelWalletManager()

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
        // Disable persistent storage to prevent auto-reconnection
        storage: 'session', // Use sessionStorage instead of localStorage
        reconnectOnPageLoad: false, // Disable automatic reconnection
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
   * Disconnect all wallets and clear session
   */
  public async disconnectAll(): Promise<void> {
    try {
      // Disconnect all active wallets
      const wallets = this.walletManager.wallets
      for (const wallet of wallets) {
        if (wallet.isActive) {
          await wallet.disconnect()
        }
      }
      
      // Clear session storage
      CitadelWalletManager.clearWalletSession()
      
      console.log('All wallets disconnected and session cleared')
    } catch (error) {
      console.error('Error disconnecting wallets:', error)
      // Still clear session even if disconnect fails
      CitadelWalletManager.clearWalletSession()
    }
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

  /**
   * Clear wallet session data to ensure clean logout
   */
  public static clearWalletSession(): void {
    try {
      // Clear sessionStorage
      sessionStorage.removeItem('use-wallet')
      sessionStorage.removeItem('walletconnect')
      
      // Clear any localStorage wallet data (fallback)
      localStorage.removeItem('use-wallet')
      localStorage.removeItem('walletconnect')
      
      // Clear Pera wallet specific storage
      sessionStorage.removeItem('PeraWallet.Wallet')
      localStorage.removeItem('PeraWallet.Wallet')
      
      // Clear Defly wallet specific storage
      sessionStorage.removeItem('DeflyWallet')
      localStorage.removeItem('DeflyWallet')
      
      console.log('Wallet session cleared')
    } catch (error) {
      console.error('Error clearing wallet session:', error)
    }
  }

  /**
   * Setup session cleanup on tab/window close
   */
  public static setupSessionCleanup(): void {
    const handleBeforeUnload = () => {
      this.clearWalletSession()
    }

    // Clear session when tab/window is closed
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Also clear on page hide (mobile browsers)
    window.addEventListener('pagehide', handleBeforeUnload)
    
    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
    }
  }
}

// Export singleton instance
export const citadelWalletManager = new CitadelWalletManager()

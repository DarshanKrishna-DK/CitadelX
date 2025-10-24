/**
 * Test utility for wallet connection validation
 * Based on Algorand DAO template best practices
 */

import { CitadelWalletManager } from './walletManager'
import { getTestnetConfig } from '../config/testnet.config'

export interface WalletTestResult {
  success: boolean
  message: string
  details?: any
}

export class WalletConnectionTester {
  private config = getTestnetConfig()

  /**
   * Test wallet address validation
   */
  testAddressValidation(address: string | null): WalletTestResult {
    try {
      const isValid = CitadelWalletManager.validateAddress(address)
      
      if (!address) {
        return {
          success: false,
          message: 'No address provided'
        }
      }

      if (!isValid) {
        return {
          success: false,
          message: 'Invalid address format',
          details: { address, expectedFormat: '58 character base32 string' }
        }
      }

      return {
        success: true,
        message: 'Address validation passed',
        details: { address }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Address validation error',
        details: { error: error instanceof Error ? error.message : error }
      }
    }
  }

  /**
   * Test network configuration
   */
  testNetworkConfig(): WalletTestResult {
    try {
      const config = this.config
      
      if (!config.algod.server) {
        return {
          success: false,
          message: 'Algod server not configured'
        }
      }

      if (!config.treasury.address) {
        return {
          success: false,
          message: 'Treasury address not configured'
        }
      }

      return {
        success: true,
        message: 'Network configuration valid',
        details: {
          network: config.algod.network,
          server: config.algod.server,
          treasury: config.treasury.address
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network configuration error',
        details: { error: error instanceof Error ? error.message : error }
      }
    }
  }

  /**
   * Test wallet connection state
   */
  testConnectionState(activeAddress: string | null, isReady: boolean): WalletTestResult {
    try {
      const connectionState = CitadelWalletManager.getConnectionState(activeAddress, isReady)
      
      if (!connectionState.isConnected) {
        return {
          success: false,
          message: 'Wallet not connected',
          details: connectionState
        }
      }

      return {
        success: true,
        message: 'Wallet connection state valid',
        details: connectionState
      }
    } catch (error) {
      return {
        success: false,
        message: 'Connection state test error',
        details: { error: error instanceof Error ? error.message : error }
      }
    }
  }

  /**
   * Run comprehensive wallet tests
   */
  runAllTests(activeAddress: string | null, isReady: boolean): {
    overall: boolean
    results: Record<string, WalletTestResult>
  } {
    const results = {
      addressValidation: this.testAddressValidation(activeAddress),
      networkConfig: this.testNetworkConfig(),
      connectionState: this.testConnectionState(activeAddress, isReady)
    }

    const overall = Object.values(results).every(result => result.success)

    return { overall, results }
  }

  /**
   * Log test results to console
   */
  logTestResults(activeAddress: string | null, isReady: boolean): void {
    console.group('🧪 Wallet Connection Tests')
    
    const { overall, results } = this.runAllTests(activeAddress, isReady)
    
    console.log(`Overall Status: ${overall ? '✅ PASS' : '❌ FAIL'}`)
    console.log('---')
    
    Object.entries(results).forEach(([testName, result]) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${testName}: ${result.message}`)
      
      if (result.details) {
        console.log('  Details:', result.details)
      }
    })
    
    console.groupEnd()
  }
}

// Export singleton instance
export const walletTester = new WalletConnectionTester()

// Helper function for quick testing
export const testWalletConnection = (activeAddress: string | null, isReady: boolean) => {
  return walletTester.runAllTests(activeAddress, isReady)
}

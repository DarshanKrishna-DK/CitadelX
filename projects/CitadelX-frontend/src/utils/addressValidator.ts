/**
 * Simple address validation utilities
 */

export const validateAlgorandAddress = (address: string | null): boolean => {
  if (!address) return false
  
  // Algorand addresses are exactly 58 characters
  if (address.length !== 58) return false
  
  // Should be a string
  if (typeof address !== 'string') return false
  
  return true
}

export const validateTreasuryAddress = (address: string): boolean => {
  // Validate the specific treasury address
  const expectedAddress = 'UCYPEDAIIVZXARWTZHECQXK5MBDBTJGG7HIX4R7QBY23YISO2QKFPD2G5Y'
  
  if (address !== expectedAddress) {
    console.warn('Treasury address mismatch:', { expected: expectedAddress, actual: address })
  }
  
  return validateAlgorandAddress(address)
}

export const debugAddresses = (activeAddress: string | null, treasuryAddress: string) => {
  console.log('Address Debug Info:', {
    activeAddress: {
      value: activeAddress,
      length: activeAddress?.length,
      type: typeof activeAddress,
      isValid: validateAlgorandAddress(activeAddress)
    },
    treasuryAddress: {
      value: treasuryAddress,
      length: treasuryAddress.length,
      type: typeof treasuryAddress,
      isValid: validateTreasuryAddress(treasuryAddress)
    }
  })
}

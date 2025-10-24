import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { supabase, User } from '../utils/supabase'
import { CitadelWalletManager } from '../utils/walletManager'

interface UserContextType {
  user: User | null
  loading: boolean
  refreshUser: () => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { activeAddress } = useWallet()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = async (walletAddress: string) => {
    try {
      setLoading(true)
      
      // Validate wallet address format first
      if (!CitadelWalletManager.validateAddress(walletAddress)) {
        console.error('Invalid wallet address format:', walletAddress)
        setUser(null)
        return
      }
      
      // First, try to find existing user
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .maybeSingle() // Use maybeSingle instead of single to avoid errors when no user found

      if (data) {
        // User exists
        console.log('User found:', data)
        setUser(data)
      } else if (!data && !error) {
        // User doesn't exist, create new user automatically
        console.log('User not found, creating new user for wallet:', walletAddress)
        const newUser = {
          wallet_address: walletAddress,
          created_at: new Date().toISOString(),
        }
        
        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single()

        if (createError) {
          console.error('Error creating user:', createError)
          
          // If it's a duplicate key error, try to fetch the user again
          if (createError.code === '23505') {
            console.log('User already exists, fetching existing user...')
            const { data: existingUser } = await supabase
              .from('users')
              .select('*')
              .eq('wallet_address', walletAddress)
              .single()
            
            if (existingUser) {
              setUser(existingUser)
            } else {
              // Create a local user object if database operations fail
              setUser({
                id: walletAddress, // Use wallet address as temporary ID
                wallet_address: walletAddress,
                created_at: new Date().toISOString(),
              } as User)
            }
          } else {
            // Create a local user object if database operations fail
            console.warn('Database user creation failed, using local user object')
            setUser({
              id: walletAddress, // Use wallet address as temporary ID
              wallet_address: walletAddress,
              created_at: new Date().toISOString(),
            } as User)
          }
        } else {
          console.log('User created successfully:', createdUser)
          setUser(createdUser)
        }
      } else if (error) {
        console.error('Error fetching user:', error)
        // Create a local user object if database operations fail
        console.warn('Database fetch failed, using local user object')
        setUser({
          id: walletAddress, // Use wallet address as temporary ID
          wallet_address: walletAddress,
          created_at: new Date().toISOString(),
        } as User)
      }
    } catch (error) {
      console.error('Error in fetchUser:', error)
      // Always provide a user object for valid wallet addresses
      if (CitadelWalletManager.validateAddress(walletAddress)) {
        console.warn('Using fallback local user object')
        setUser({
          id: walletAddress, // Use wallet address as temporary ID
          wallet_address: walletAddress,
          created_at: new Date().toISOString(),
        } as User)
      } else {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    if (activeAddress) {
      await fetchUser(activeAddress)
    }
  }

  const updateUser = async (updates: Partial<User>) => {
    if (!user || !activeAddress) return

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('wallet_address', activeAddress)
        .select()
        .single()

      if (error) {
        console.error('Error updating user:', error)
        throw error
      } else {
        setUser(data)
      }
    } catch (error) {
      console.error('Error in updateUser:', error)
      throw error
    }
  }

  useEffect(() => {
    if (activeAddress) {
      fetchUser(activeAddress)
    } else {
      setUser(null)
      setLoading(false)
    }
  }, [activeAddress])

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, updateUser }}>
      {children}
    </UserContext.Provider>
  )
}



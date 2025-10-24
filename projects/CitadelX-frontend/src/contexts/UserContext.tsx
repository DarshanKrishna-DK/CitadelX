import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { supabase, User } from '../utils/supabase'

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
        // User doesn't exist, create new user
        console.log('User not found, creating new user...')
        const newUser = {
          wallet_address: walletAddress,
        }
        
        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single()

        if (createError) {
          console.error('Error creating user:', createError)
          console.error('Create error details:', {
            message: createError.message,
            details: createError.details,
            hint: createError.hint,
            code: createError.code
          })
          
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
              setUser(null)
            }
          } else {
            setUser(null)
          }
        } else {
          console.log('User created successfully:', createdUser)
          setUser(createdUser)
        }
      } else if (error) {
        console.error('Error fetching user:', error)
        console.error('Fetch error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setUser(null)
      }
    } catch (error) {
      console.error('Error in fetchUser:', error)
      setUser(null)
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



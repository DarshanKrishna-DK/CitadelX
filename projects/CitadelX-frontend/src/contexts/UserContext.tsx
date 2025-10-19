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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create new user
        const newUser: Partial<User> = {
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
        } else {
          setUser(createdUser)
        }
      } else if (error) {
        console.error('Error fetching user:', error)
      } else {
        setUser(data)
      }
    } catch (error) {
      console.error('Error in fetchUser:', error)
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



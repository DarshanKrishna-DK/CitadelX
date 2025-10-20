import axios from 'axios'
import { supabase } from './supabase'

/**
 * YouTube OAuth Integration
 * Handles authentication and channel connection
 */

export interface YouTubeChannel {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  subscriberCount: number
}

/**
 * Initiate YouTube OAuth flow
 */
export const initiateYouTubeAuth = (): void => {
  const clientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID
  const redirectUri = import.meta.env.VITE_YOUTUBE_REDIRECT_URI || `${window.location.origin}/auth/callback`
  const scope = 'https://www.googleapis.com/auth/youtube.readonly'

  if (!clientId) {
    console.error('YouTube Client ID not configured')
    return
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.append('client_id', clientId)
  authUrl.searchParams.append('redirect_uri', redirectUri)
  authUrl.searchParams.append('response_type', 'code')
  authUrl.searchParams.append('scope', scope)
  authUrl.searchParams.append('access_type', 'offline')
  authUrl.searchParams.append('prompt', 'consent')

  window.location.href = authUrl.toString()
}

/**
 * Handle OAuth callback and exchange code for tokens
 */
export const handleYouTubeCallback = async (code: string): Promise<YouTubeChannel | null> => {
  try {
    const clientId = import.meta.env.VITE_YOUTUBE_CLIENT_ID
    const clientSecret = import.meta.env.VITE_YOUTUBE_CLIENT_SECRET
    const redirectUri = import.meta.env.VITE_YOUTUBE_REDIRECT_URI || `${window.location.origin}/auth/callback`

    // Exchange code for access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })

    const { access_token, refresh_token } = tokenResponse.data

    // Get channel information
    const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet,statistics',
        mine: true,
      },
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    if (channelResponse.data.items && channelResponse.data.items.length > 0) {
      const channel = channelResponse.data.items[0]
      
      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnailUrl: channel.snippet.thumbnails.default.url,
        subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
      }
    }

    return null
  } catch (error) {
    console.error('Error handling YouTube callback:', error)
    return null
  }
}

/**
 * Disconnect YouTube channel
 */
export const disconnectYouTube = async (walletAddress: string): Promise<void> => {
  try {
    await supabase
      .from('users')
      .update({
        youtube_channel_id: null,
        youtube_channel_name: null,
      })
      .eq('wallet_address', walletAddress)
  } catch (error) {
    console.error('Error disconnecting YouTube:', error)
    throw error
  }
}

/**
 * Save YouTube channel to user profile
 */
export const saveYouTubeChannel = async (
  walletAddress: string,
  channel: YouTubeChannel,
): Promise<void> => {
  try {
    await supabase
      .from('users')
      .update({
        youtube_channel_id: channel.id,
        youtube_channel_name: channel.title,
      })
      .eq('wallet_address', walletAddress)
  } catch (error) {
    console.error('Error saving YouTube channel:', error)
    throw error
  }
}

/**
 * Check if user has connected YouTube
 */
export const hasYouTubeConnected = async (walletAddress: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('users')
      .select('youtube_channel_id')
      .eq('wallet_address', walletAddress)
      .single()

    return !!data?.youtube_channel_id
  } catch (error) {
    console.error('Error checking YouTube connection:', error)
    return false
  }
}






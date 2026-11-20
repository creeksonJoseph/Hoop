import { useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function useOnboarding() {
  const [loading, setLoading] = useState(false)
  const { refreshUser, markOnboarded } = useAuth()
  const { toast } = useToast()

  const connect = async (zernioApiKey) => {
    setLoading(true)
    try {
      const { data } = await api.post('/onboarding/connect', { zernio_api_key: zernioApiKey })
      // The key is now saved. Refresh the authoritative user status before
      // navigating so the protected-route guard lets us into /home.
      try {
        await refreshUser()
      } catch {
        markOnboarded()
      }
      return data
    } catch (err) {
      toast(err.response?.data?.detail || 'Connection failed', 'error')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { connect, loading }
}

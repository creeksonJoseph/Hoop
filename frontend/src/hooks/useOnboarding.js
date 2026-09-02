import { useState } from 'react'
import api from '../lib/api'
import { useToast } from '../context/ToastContext'

export function useOnboarding() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const connect = async (zernioApiKey) => {
    setLoading(true)
    try {
      const { data } = await api.post('/onboarding/connect', { zernio_api_key: zernioApiKey })
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

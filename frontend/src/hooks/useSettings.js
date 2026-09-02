import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { useToast } from '../context/ToastContext'

export function useSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings')
      setSettings(data)
    } catch {
      toast('Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const updateApiKey = async (key) => {
    try {
      await api.put('/settings/api-key', { zernio_api_key: key })
      toast('API Key updated & accounts re-linked', 'success')
      await fetchSettings()
      return true
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to update API key', 'error')
      return false
    }
  }

  const deleteApiKey = async () => {
    try {
      await api.delete('/settings/api-key')
      return true
    } catch {
      toast('Failed to disconnect account', 'error')
      return false
    }
  }

  return { settings, loading, updateApiKey, deleteApiKey }
}

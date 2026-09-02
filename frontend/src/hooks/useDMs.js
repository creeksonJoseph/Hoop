import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { useToast } from '../context/ToastContext'

export function useDMs() {
  const [dms, setDMs] = useState([])
  const [hasRealAccount, setHasRealAccount] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchDMs = useCallback(async () => {
    try {
      const { data } = await api.get('/dms')
      setDMs(data.dms)
      setHasRealAccount(data.has_real_account)
    } catch {
      toast('Failed to load conversations', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchDMs() }, [fetchDMs])

  const addDM = async (igUsername) => {
    try {
      const { data } = await api.post('/dms', { ig_username: igUsername })
      setDMs(data.dms)
      return true
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to add conversation', 'error')
      return false
    }
  }

  const deleteDM = async (igUsername) => {
    try {
      const { data } = await api.delete(`/dms/${igUsername}`)
      setDMs(data.dms)
    } catch {
      toast('Failed to delete conversation', 'error')
    }
  }

  return { dms, hasRealAccount, loading, addDM, deleteDM }
}

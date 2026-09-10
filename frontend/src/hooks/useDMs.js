import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

export function useDMs() {
  const [dms, setDMs] = useState([])
  const [hasRealAccount, setHasRealAccount] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const fetchDMs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/dms')
      setDMs(data.dms)
      setHasRealAccount(data.has_real_account)
    } catch (err) {
      toastRef.current(err.response?.data?.detail || `Failed to load conversations (${err.response?.status})`, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDMs() }, [fetchDMs])

  // Supabase Realtime — refresh list when new message is inserted
  useEffect(() => {
    const channel = supabase
      .channel('dms_list_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchDMs()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchDMs])

  const addDM = async (igUsername) => {
    try {
      const { data } = await api.post('/dms', { ig_username: igUsername })
      setDMs(data.dms)
      return true
    } catch (err) {
      toastRef.current(err.response?.data?.detail || 'Failed to add conversation', 'error')
      return false
    }
  }

  const deleteDM = async (igUsername) => {
    try {
      const { data } = await api.delete(`/dms/${igUsername}`)
      setDMs(data.dms)
    } catch (err) {
      toastRef.current(err.response?.data?.detail || 'Failed to delete conversation', 'error')
    }
  }

  return { dms, hasRealAccount, loading, fetchDMs, addDM, deleteDM }
}

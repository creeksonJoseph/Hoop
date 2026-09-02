import { useCallback, useEffect, useState } from 'react'
import api from '../lib/api'
import { useToast } from '../context/ToastContext'

export function useSessions(igUsername) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await api.get(`/sessions/${igUsername}`)
      setSessions(data.sessions)
    } catch {
      toast('Failed to load sessions', 'error')
    } finally {
      setLoading(false)
    }
  }, [igUsername, toast])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const generateSession = async (wingmanName, accessLevel = 'read') => {
    try {
      const { data } = await api.post(`/sessions/${igUsername}`, {
        wingman_name: wingmanName,
        access_level: accessLevel,
      })
      await fetchSessions()
      return data
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to generate session', 'error')
      return null
    }
  }

  const updateSession = async (sessionId, accessLevel) => {
    try {
      const { data } = await api.patch(`/sessions/${sessionId}`, { access_level: accessLevel })
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? data : s)))
    } catch {
      toast('Failed to update session', 'error')
    }
  }

  const deleteSession = async (sessionId) => {
    try {
      await api.delete(`/sessions/${sessionId}`)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch {
      toast('Failed to delete session', 'error')
    }
  }

  return { sessions, loading, generateSession, updateSession, deleteSession }
}

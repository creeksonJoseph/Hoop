import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { supabase } from '../lib/supabase'

const publicApi = axios.create({ baseURL: 'https://hoop-4thy.onrender.com/api' })

export function useWingman(token) {
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [convId, setConvId] = useState(null)
  const [loading, setLoading] = useState(true)
  const seenIds = useRef(new Set())

  const addMessage = useCallback((msg) => {
    if (seenIds.current.has(msg.id)) return
    seenIds.current.add(msg.id)
    setMessages((prev) => [...prev, msg])
  }, [])

  useEffect(() => {
    Promise.all([
      publicApi.get(`/wingman/${token}`),
      publicApi.get(`/wingman/${token}/messages`),
    ]).then(([s, m]) => {
      setSession(s.data)
      m.data.messages.forEach((msg) => seenIds.current.add(msg.id))
      setMessages(m.data.messages)
      // derive convId from first message if available
      if (m.data.messages.length > 0) {
        setConvId(m.data.conversation_id || null)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  // Supabase Realtime for new inbound messages
  useEffect(() => {
    if (!convId) return
    const channel = supabase
      .channel(`wingman:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const row = payload.new
          addMessage({
            id: row.id,
            message: row.message,
            direction: row.direction,
            sender_name: row.sender_name,
            created_at: row.created_at,
            attachments: [],
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [convId, addMessage])

  const sendMessage = async (text) => {
    if (!text.trim()) return false
    try {
      await publicApi.post(`/wingman/${token}/reply`, { message: text })
      return true
    } catch {
      return false
    }
  }

  return { session, messages, loading, sendMessage }
}

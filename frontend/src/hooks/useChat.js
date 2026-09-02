import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

export function useChat(igUsername) {
  const [messages, setMessages] = useState([])
  const [convId, setConvId] = useState(null)
  const [loading, setLoading] = useState(true)
  const seenIds = useRef(new Set())
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const addMessage = useCallback((msg) => {
    if (seenIds.current.has(msg.id)) return
    seenIds.current.add(msg.id)
    setMessages((prev) => [...prev, msg])
  }, [])

  // Initial fetch
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get('/messages', {
          params: { username: igUsername, limit: 50, sort: 'asc' },
        })
        if (cancelled) return
        seenIds.current.clear()
        data.messages.forEach((m) => seenIds.current.add(m.id))
        setMessages(data.messages)
        setConvId(data.conversation_id)
      } catch (err) {
        if (!cancelled) toastRef.current('Failed to load messages', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [igUsername])

  // Supabase Realtime — subscribe to new rows in messages for this conversation
  useEffect(() => {
    if (!convId) return

    const channel = supabase
      .channel(`messages:${convId}`)
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
    const optimistic = {
      id: `opt_${Date.now()}`,
      message: text,
      direction: 'outgoing',
      sender_name: 'You',
      created_at: new Date().toISOString(),
      attachments: [],
    }
    addMessage(optimistic)
    try {
      await api.post('/messages/reply', { message: text }, {
        params: { username: igUsername },
      })
      return true
    } catch (err) {
      toastRef.current(err.response?.data?.detail || 'Send failed', 'error')
      seenIds.current.delete(optimistic.id)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      return false
    }
  }

  const deleteMessage = async (msgId) => {
    try {
      await api.delete(`/admin/messages/${msgId}`)
      seenIds.current.delete(msgId)
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
      toastRef.current('Message deleted', 'success')
    } catch (err) {
      toastRef.current(err.response?.data?.detail || 'Delete failed', 'error')
    }
  }

  return { messages, loading, sendMessage, deleteMessage }
}

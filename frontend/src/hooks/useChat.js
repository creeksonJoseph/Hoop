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
    console.log('[addMessage] called with id:', msg.id, 'direction:', msg.direction, 'text:', msg.message)
    if (seenIds.current.has(msg.id)) {
      console.warn('[addMessage] SKIPPED — already in seenIds:', msg.id)
      return
    }
    seenIds.current.add(msg.id)
    // Replace any optimistic placeholder that has the same text + direction
    setMessages((prev) => {
      const optIdx = prev.findIndex(
        (m) => m.id.startsWith('opt_') && m.message === msg.message && m.direction === msg.direction
      )
      if (optIdx !== -1) {
        console.log('[addMessage] replacing optimistic bubble at index', optIdx)
        seenIds.current.delete(prev[optIdx].id)
        const next = [...prev]
        next[optIdx] = msg
        return next
      }
      console.log('[addMessage] appending new message, total will be:', prev.length + 1)
      return [...prev, msg]
    })
  }, [])

  // Initial fetch on mount or when igUsername changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessages([])
    setConvId(null)

    const load = async () => {
      try {
        const { data } = await api.get('/messages', {
          params: { username: igUsername, limit: 50, sort: 'desc' },
        })
        if (cancelled) return
        seenIds.current.clear()
        data.messages.forEach((m) => seenIds.current.add(m.id))
        setMessages(data.messages)
        setConvId(data.conversation_id)
        console.log('[useChat] load done — conv_id:', data.conversation_id, '| seenIds count:', seenIds.current.size)
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

    let retryTimer = null
    let active = true
    const channelRef = { current: null }

    const subscribe = () => {
      if (!active) return

      const channelName = `messages_realtime_${convId}_${Date.now()}`
      const filterStr = `conversation_id=eq.${convId}`
      console.log('[Supabase Realtime] subscribing — channel:', channelName, '| filter:', filterStr)

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: filterStr,
          },
          (payload) => {
            console.log('[Supabase Realtime] 🔔 RAW EVENT received:', JSON.stringify(payload.new))
            const row = payload.new
            if (!row || !row.id) {
              console.error('[Supabase Realtime] payload.new is missing or has no id:', payload)
              return
            }
            console.log('[Supabase Realtime] row.conversation_id:', row.conversation_id, '| subscribed convId:', convId)
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
        .subscribe((status, err) => {
          console.log('[Supabase Realtime] status:', status, '| conv_id:', convId)
          if (err) console.error('[Supabase Realtime] subscription error:', err)
          // Guard: removeChannel() itself fires CLOSED — use a flag to prevent
          // the cascade: CHANNEL_ERROR → removeChannel → CLOSED → removeChannel → ...
          if ((status === 'CHANNEL_ERROR' || status === 'CLOSED') && active && !retryTimer) {
            console.warn('[Supabase Realtime] channel lost — retrying in 2s')
            // Don't call removeChannel here — the socket is already dead (1006).
            // Calling it now just triggers another CLOSED callback and the loop repeats.
            retryTimer = setTimeout(() => {
              retryTimer = null
              subscribe()
            }, 2000)
          }
        })

      channelRef.current = channel
    }

    subscribe()

    return () => {
      active = false
      clearTimeout(retryTimer)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
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
      // Realtime will deliver the real message and replace the optimistic one.
      // If Realtime is down, keep the optimistic bubble so the UI isn't blank.
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

import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import { useToast } from '../context/ToastContext'

export function useChat(igUsername) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [wsStatus, setWsStatus] = useState('disconnected')
  const seenIds = useRef(new Set())
  const wsRef = useRef(null)
  const { toast } = useToast()

  const addMessage = useCallback((msg) => {
    if (seenIds.current.has(msg.id)) return
    seenIds.current.add(msg.id)
    setMessages((prev) => [...prev, msg])
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get('/messages', {
        params: { username: igUsername, limit: 50, sort: 'asc' },
      })
      seenIds.current.clear()
      data.messages.forEach((m) => seenIds.current.add(m.id))
      setMessages(data.messages)
    } catch (err) {
      toast('Failed to load messages', 'error')
    } finally {
      setLoading(false)
    }
  }, [igUsername, toast])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`ws://${location.host}/ws/${igUsername}`)
      wsRef.current = ws
      ws.onopen = () => setWsStatus('connected')
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data)
          if (d.type === 'new_message' && d.message) addMessage(d.message)
        } catch {}
      }
      ws.onclose = () => {
        setWsStatus('disconnected')
        setTimeout(connect, 4000)
      }
      ws.onerror = () => ws.close()
    }
    connect()
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send('ping')
    }, 25000)
    return () => { clearInterval(ping); wsRef.current?.close() }
  }, [igUsername, addMessage])

  const sendMessage = async (text) => {
    if (!text.trim()) return
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
    } catch (err) {
      toast(err.response?.data?.detail || 'Send failed', 'error')
      seenIds.current.delete(optimistic.id)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      return false
    }
    return true
  }

  const deleteMessage = async (msgId) => {
    try {
      await api.delete(`/admin/messages/${msgId}`)
      seenIds.current.delete(msgId)
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
      toast('Message deleted', 'success')
    } catch (err) {
      toast(err.response?.data?.detail || 'Delete failed', 'error')
    }
  }

  return { messages, loading, wsStatus, sendMessage, deleteMessage }
}

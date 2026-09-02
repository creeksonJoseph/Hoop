import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'

const publicApi = axios.create({ baseURL: '/api' })

export function useWingman(token) {
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [wsStatus, setWsStatus] = useState('disconnected')
  const seenIds = useRef(new Set())
  const wsRef = useRef(null)

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
    }).catch(() => {}).finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`ws://${location.host}/ws/view/${token}`)
      wsRef.current = ws
      ws.onopen = () => setWsStatus('connected')
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data)
          if (d.type === 'new_message' && d.message) addMessage(d.message)
          if (d.type === 'access_revoked') setSession((s) => s ? { ...s, access_level: 'revoked' } : s)
        } catch {}
      }
      ws.onclose = () => { setWsStatus('disconnected'); setTimeout(connect, 4000) }
      ws.onerror = () => ws.close()
    }
    connect()
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send('ping')
    }, 25000)
    return () => { clearInterval(ping); wsRef.current?.close() }
  }, [token, addMessage])

  const sendMessage = async (text) => {
    if (!text.trim()) return false
    try {
      await publicApi.post(`/wingman/${token}/reply`, { message: text })
      return true
    } catch {
      return false
    }
  }

  return { session, messages, loading, wsStatus, sendMessage }
}

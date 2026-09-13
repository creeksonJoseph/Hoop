/**
 * hooks/chat/useMessages.js
 * ==========================
 * Manages the initial message fetch for a DM conversation.
 * Runs once on mount and whenever `igUsername` changes.
 *
 * Returns: { messages, participantName, profilePicUrl, convId, loading, seenIds, addMessage }
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../lib/api'
import { useToast } from '../../context/ToastContext'

export function useMessages(igUsername) {
  const [messages, setMessages] = useState([])
  const [participantName, setParticipantName] = useState(null)
  const [profilePicUrl, setProfilePicUrl] = useState(null)
  const [convId, setConvId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const seenIds = useRef(new Set())
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const addMessage = useCallback((msg) => {
    console.log('[addMessage] called with id:', msg.id, 'direction:', msg.direction)
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

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessages([])
    setConvId(null)
    setParticipantName(null)
    setProfilePicUrl(null)
    setNextCursor(null)
    setHasMore(false)

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
        setParticipantName(data.participant_name || null)
        setProfilePicUrl(data.profile_pic_url || null)

        const pag = data.pagination || {}
        const cur = pag.nextCursor || null
        setNextCursor(cur)
        setHasMore(Boolean(pag.hasMore || cur))
        console.log('[useMessages] load done — conv_id:', data.conversation_id, 'hasMore:', Boolean(pag.hasMore || cur))
      } catch (err) {
        if (!cancelled) toastRef.current('Failed to load messages', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [igUsername])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor || !igUsername) return
    setLoadingMore(true)

    try {
      const { data } = await api.get('/messages', {
        params: { username: igUsername, limit: 50, sort: 'desc', cursor: nextCursor },
      })

      const pag = data.pagination || {}
      const cur = pag.nextCursor || null
      setNextCursor(cur)
      setHasMore(Boolean(pag.hasMore && cur))

      // Only prepend messages we haven't seen yet (older ones arrive first)
      const fetchedMsgs = data.messages || []
      const newOlderMsgs = fetchedMsgs.filter((m) => !seenIds.current.has(m.id))
      newOlderMsgs.forEach((m) => seenIds.current.add(m.id))

      if (newOlderMsgs.length > 0) {
        setMessages((prev) => [...newOlderMsgs, ...prev])
      }

      console.log('[useMessages] loadMore done — fetched:', fetchedMsgs.length, 'new:', newOlderMsgs.length, 'hasMore:', Boolean(pag.hasMore && cur))
    } catch (err) {
      console.error('[useMessages] loadMore error:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [igUsername, nextCursor, hasMore, loadingMore])

  return {
    messages,
    setMessages,
    participantName,
    profilePicUrl,
    convId,
    loading,
    seenIds,
    addMessage,
    hasMore,
    loadingMore,
    loadMore,
  }
}


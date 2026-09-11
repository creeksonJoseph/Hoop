/**
 * hooks/chat/useRealtime.js
 * ==========================
 * Manages a Supabase Realtime subscription for a DM conversation.
 * Automatically retries on connection errors using an exponential-ish delay.
 *
 * Returns nothing — drives state via the `addMessage` callback passed in.
 */
import { useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export function useRealtime(convId, addMessage) {
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
}

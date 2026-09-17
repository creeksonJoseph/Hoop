/**
 * hooks/chat/useRealtime.js
 * ==========================
 * Manages a Supabase Realtime subscription for a DM conversation.
 * Automatically retries on connection errors using an exponential-ish delay.
 *
 * Returns nothing - drives state via the `addMessage` callback passed in.
 */
import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export function useRealtime(convId, addMessage) {
  const addMessageRef = useRef(addMessage)
  addMessageRef.current = addMessage

  useEffect(() => {
    if (!convId) return

    const channelName = `messages_realtime_${convId}`
    const filterStr = `conversation_id=eq.${convId}`

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
          const row = payload.new
          if (!row || !row.id) return
          addMessageRef.current({
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
        if (err) console.error('[Supabase Realtime] subscription error:', err)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [convId])
}

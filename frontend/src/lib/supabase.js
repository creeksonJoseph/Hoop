import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './api'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    // Send a heartbeat every 20s to keep Render's proxy from dropping idle WS connections
    heartbeatIntervalMs: 20_000,
    // Exponential backoff: retry at 1s, 2s, 4s, 8s … capped at 30s
    reconnectAfterMs: (tries) => Math.min(1000 * 2 ** tries, 30_000),
  },
})

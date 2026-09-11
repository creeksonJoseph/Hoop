import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    // Send a heartbeat every 20s to keep Render's proxy from dropping idle WS connections
    heartbeatIntervalMs: 20_000,
    // Exponential backoff: retry at 1s, 2s, 4s, 8s … capped at 30s
    reconnectAfterMs: (tries) => Math.min(1000 * 2 ** tries, 30_000),
  },
})

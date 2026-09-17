import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api'
import { clearDMsCache } from '../hooks/useDMs'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeIgUsername, setActiveIgUsername] = useState(() => localStorage.getItem('hoop_active_ig') || null)
  // Monotonically increasing counter - incremented on every account switch.
  // Hooks that depend on this will refetch when the active account changes.
  const [accountVersion, setAccountVersion] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('hoop_token')
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem('hoop_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('hoop_token', token)
    setUser(userData)
  }

  const setActiveAccount = (username) => {
    const normalized = username?.replace(/^@/, '').toLowerCase() || null
    if (normalized) localStorage.setItem('hoop_active_ig', normalized)
    else localStorage.removeItem('hoop_active_ig')
    setActiveIgUsername(normalized)
    setUser((current) => current ? { ...current, active_ig_username: normalized } : current)
    // Clear ALL data caches - DMs list, any session caches, etc.
    // accountVersion bump causes every hook that depends on it to re-fetch.
    clearDMsCache()
    setAccountVersion((v) => v + 1)
  }

  const logout = () => {
    localStorage.removeItem('hoop_token')
    localStorage.removeItem('hoop_active_ig')
    clearDMsCache()
    setActiveIgUsername(null)
    setAccountVersion(0)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user: user ? { ...user, active_ig_username: activeIgUsername } : user,
      loading,
      login,
      logout,
      setActiveAccount,
      accountVersion,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)


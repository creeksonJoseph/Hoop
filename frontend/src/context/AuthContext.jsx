import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api'
import { clearDMsCache } from '../hooks/useDMs'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeIgUsername, setActiveIgUsername] = useState(() => localStorage.getItem('hoop_active_ig') || null)

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
    clearDMsCache()
  }

  const logout = () => {
    localStorage.removeItem('hoop_token')
    localStorage.removeItem('hoop_active_ig')
    clearDMsCache()
    setActiveIgUsername(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user: user ? { ...user, active_ig_username: activeIgUsername } : user, loading, login, logout, setActiveAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

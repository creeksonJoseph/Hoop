import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function useLogin() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const submit = async (email, password) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.access_token, data.user)
      navigate(data.onboarded ? '/home' : '/onboarding')
    } catch (err) {
      toast(err.response?.data?.detail || 'Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return { submit, loading }
}

export function useSignup() {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  const submit = async (email, password, confirmPassword) => {
    setLoading(true)
    try {
      await api.post('/auth/signup', { email, password, confirm_password: confirmPassword })
      toast('Account created — please sign in', 'success')
      navigate('/login')
    } catch (err) {
      toast(err.response?.data?.detail || 'Signup failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return { submit, loading }
}

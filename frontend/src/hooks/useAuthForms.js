import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function useLogin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const submit = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.access_token, data.user)
      navigate(data.onboarded ? '/home' : '/onboarding')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Please try again.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return { submit, loading, error, setError }
}

export function useSignup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const submit = async (email, password, confirmPassword) => {
    setLoading(true)
    setError(null)
    if (password !== confirmPassword) {
      const msg = 'Passwords do not match'
      setError(msg)
      toast(msg, 'error')
      setLoading(false)
      return
    }
    try {
      await api.post('/auth/signup', { email, password, confirm_password: confirmPassword })
      toast('Account created - please sign in', 'success')
      navigate('/login')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Signup failed'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return { submit, loading, error, setError }
}

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const submitGoogleToken = async (credential) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/google', { credential })
      login(data.access_token, data.user)
      toast('Signed in with Google', 'success')
      navigate(data.onboarded ? '/home' : '/onboarding')
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Google authentication failed.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return { submitGoogleToken, loading, error, setError }
}

export function useSendOTP() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const sendOTP = async (email) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/send-otp', { email })
      toast(data.message || 'Verification code sent to email', 'success')
      return true
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to send OTP code'
      setError(msg)
      toast(msg, 'error')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { sendOTP, loading, error, setError }
}

export function useVerifyOTP() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const verifyOTP = async (email, code, password, confirmPassword) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email,
        code,
        password,
        confirm_password: confirmPassword,
      })
      login(data.access_token, data.user)
      toast('Email verified & account created!', 'success')
      navigate('/onboarding')
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'OTP verification failed'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return { verifyOTP, loading, error, setError }
}

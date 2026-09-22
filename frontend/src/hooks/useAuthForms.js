import { useState, useEffect, useRef } from 'react'
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

export function useSignupFlow() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [signupToken, setSignupToken] = useState('')
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef(null)

  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000)
    }
    return () => clearTimeout(timerRef.current)
  }, [countdown])

  const clearError = () => setError('')

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/signup/send-otp', { email: email.trim().toLowerCase() })
      toast(data.message || 'Verification code sent!', 'info')
      setStep(2)
      setCountdown(60)
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to send verification code'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    clearError()
    try {
      const { data } = await api.post('/auth/signup/send-otp', { email: email.trim().toLowerCase() })
      toast(data.message || 'Verification code resent!', 'info')
      setCountdown(60)
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to resend code'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault()
    if (!otp) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/signup/verify-otp', { email: email.trim().toLowerCase(), otp: otp.trim() })
      setSignupToken(data.signup_token)
      toast('Email verified!', 'success')
      setStep(3)
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Invalid verification code'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (e) => {
    if (e) e.preventDefault()
    if (form.password !== form.confirm) {
      const msg = 'Passwords do not match'
      setError(msg)
      toast(msg, 'error')
      return
    }
    if (form.password.length < 8) {
      const msg = 'Password must be at least 8 characters'
      setError(msg)
      toast(msg, 'error')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/signup/complete', {
        signup_token: signupToken,
        password: form.password,
        confirm_password: form.confirm,
      })
      login(data.access_token, data.user)
      toast('Account created successfully!', 'success')
      navigate(data.onboarded ? '/home' : '/onboarding')
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Account creation failed'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const resetToEmail = () => {
    setStep(1)
    setOtp('')
    clearError()
    setCountdown(0)
  }

  return {
    step,
    setStep,
    email,
    setEmail,
    otp,
    setOtp,
    form,
    setForm,
    showPwd,
    setShowPwd,
    loading,
    error,
    countdown,
    clearError,
    handleSendOtp,
    handleResendOtp,
    handleVerifyOtp,
    handleComplete,
    resetToEmail,
  }
}

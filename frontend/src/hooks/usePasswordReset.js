import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useToast } from '../context/ToastContext'

export function usePasswordReset() {
  const [step, setStep] = useState(1) // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ otp: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      toast(data.message || 'Verification code sent', 'success')
      setStep(2)
      setCountdown(60)
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to send code'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return
    await handleSendOtp()
  }

  const handleReset = async (e) => {
    if (e) e.preventDefault()
    if (form.password !== form.confirm) {
      const msg = 'Passwords do not match'
      setError(msg)
      toast(msg, 'error')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/reset-password', {
        email,
        otp: form.otp,
        new_password: form.password,
        confirm_password: form.confirm,
      })
      toast(data.message || 'Password updated successfully!', 'success')
      navigate('/login')
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to reset password'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return {
    step,
    setStep,
    email,
    setEmail,
    form,
    setForm,
    showPwd,
    setShowPwd,
    loading,
    error,
    setError,
    countdown,
    handleSendOtp,
    handleResendOtp,
    handleReset,
  }
}

export function useChangePassword() {
  const [pwdStep, setPwdStep] = useState(1) // 1: Send OTP, 2: Enter OTP, 3: Verified & Set New Pwd
  const [pwdForm, setPwdForm] = useState({ otp: '', next: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdCountdown, setPwdCountdown] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    let timer
    if (pwdCountdown > 0) {
      timer = setTimeout(() => setPwdCountdown((c) => c - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [pwdCountdown])

  const handleRequestChangeOtp = async (e) => {
    if (e) e.preventDefault()
    setPwdLoading(true)
    setPwdError('')
    setPwdSuccess('')
    try {
      const { data } = await api.post('/auth/send-change-otp')
      toast(data.message || 'Verification code sent to your email', 'success')
      setPwdStep(2)
      setPwdCountdown(60)
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to send verification code'
      setPwdError(msg)
      toast(msg, 'error')
    } finally {
      setPwdLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (pwdCountdown > 0 || pwdLoading) return
    await handleRequestChangeOtp()
  }

  const handleVerifyOtp = (e) => {
    if (e) e.preventDefault()
    if (!pwdForm.otp || pwdForm.otp.trim().length !== 6) {
      const msg = 'Please enter a valid 6-digit verification code'
      setPwdError(msg)
      toast(msg, 'error')
      return
    }
    setPwdError('')
    setPwdStep(3)
  }

  const handleChangePassword = async (e) => {
    if (e) e.preventDefault()
    if (pwdForm.next !== pwdForm.confirm) {
      const msg = 'Passwords do not match'
      setPwdError(msg)
      toast(msg, 'error')
      return
    }
    setPwdLoading(true)
    setPwdError('')
    setPwdSuccess('')
    try {
      const { data } = await api.post('/auth/change-password', {
        otp: pwdForm.otp,
        new_password: pwdForm.next,
        confirm_password: pwdForm.confirm,
      })
      const successMsg = data.message || 'Password changed successfully'
      setPwdSuccess(successMsg)
      toast(successMsg, 'success')
      setPwdForm({ otp: '', next: '', confirm: '' })
      setPwdStep(1)
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to change password'
      setPwdError(msg)
      toast(msg, 'error')
    } finally {
      setPwdLoading(false)
    }
  }

  return {
    pwdStep,
    setPwdStep,
    pwdForm,
    setPwdForm,
    showPwd,
    setShowPwd,
    pwdLoading,
    pwdError,
    setPwdError,
    pwdSuccess,
    pwdCountdown,
    handleRequestChangeOtp,
    handleVerifyOtp,
    handleResendOtp,
    handleChangePassword,
  }
}

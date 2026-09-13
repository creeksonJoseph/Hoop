import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Loader as Loader2, Calendar } from 'lucide-react'
import { useSignup } from '../hooks/useAuthForms'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const { submit, loading } = useSignup()

  const handleSubmit = (e) => {
    e.preventDefault()
    submit(email, password, confirm)
  }

  return (
    <div className="min-h-screen bg-[#f9f9f8] text-[#191918] flex items-center justify-center p-4 selection:bg-[#e6f3fe] selection:text-[#0075de] font-sans">
      <div className="w-full max-w-[380px] space-y-6 fade-up">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-11 h-11 rounded-[10px] bg-white border border-[#dfdcd9] flex items-center justify-center shadow-sm">
            <Calendar size={22} className="text-[#191918]" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#191918] tracking-tight">Create your Hooop account</h1>
            <p className="text-[13px] text-[#615d59] mt-1">High-density Instagram DM management</p>
          </div>
        </div>

        <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.06)] space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#494744] mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" strokeWidth={2} />
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                  placeholder="name@organization.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#494744] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" strokeWidth={2} />
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#494744] mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" strokeWidth={2} />
                <input
                  type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-[#0075de] hover:bg-[#005bab] active:bg-[#00396b] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#f0f0f0] text-center">
            <p className="text-[12px] text-[#615d59]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#0075de] hover:text-[#005bab] transition-colors font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

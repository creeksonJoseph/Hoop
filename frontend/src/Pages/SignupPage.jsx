import { useState } from 'react'
import { Link } from 'react-router-dom'
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
      <div className="w-full max-w-[360px] space-y-6">
        {/* Notion Calendar Light Header / Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-10 h-10 rounded-[8px] bg-white border border-[#dfdcd9] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-[#191918]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-[#191918] tracking-tight">Create your Hoop account</h1>
            <p className="text-[13px] text-[#615d59] mt-0.5">High-density Instagram DM management</p>
          </div>
        </div>

        {/* Notion Tatami Light Card Container */}
        <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.06)] space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#494744] mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[#dfdcd9] rounded-[6px] px-3 py-2 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-1 focus:ring-[#0075de] transition-colors duration-150"
                placeholder="name@organization.com"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#494744] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#dfdcd9] rounded-[6px] px-3 py-2 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-1 focus:ring-[#0075de] transition-colors duration-150"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#494744] mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-white border border-[#dfdcd9] rounded-[6px] px-3 py-2 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-1 focus:ring-[#0075de] transition-colors duration-150"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0075de] hover:bg-[#005bab] active:bg-[#00396b] text-white font-medium py-2 rounded-[6px] text-[13px] transition-colors duration-150 disabled:opacity-50 mt-1 flex items-center justify-center space-x-2 shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span>Creating account…</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-[#f0f0f0] text-center">
            <p className="text-[12px] text-[#615d59]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#0075de] hover:text-[#005bab] transition-colors duration-150 font-medium ml-0.5">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLogin } from '../hooks/useAuthForms'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { submit, loading } = useLogin()

  const handleSubmit = (e) => {
    e.preventDefault()
    submit(email, password)
  }

  return (
    <div className="min-h-screen bg-[#131313] flex items-center justify-center px-4">
      <div className="w-full max-w-sm fade-up">
        <div className="flex items-center justify-center mb-8">
          <div className="w-10 h-10 rounded-full bg-[#ffe19e] flex items-center justify-center font-bold text-[#3e2e00] text-lg">H</div>
          <span className="ml-3 text-xl font-semibold text-[#e5e2e1]">Hoop</span>
        </div>

        <div className="bg-[#201f1f] border border-[#4d4638] rounded-[18px] p-6 space-y-4">
          <h1 className="text-lg font-semibold text-[#e5e2e1]">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#d0c5b2] mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1c1b1b] border border-[#4d4638] rounded-[10px] px-3 py-2.5 text-sm text-[#e5e2e1] placeholder:text-[#d0c5b2]/50 focus:outline-none focus:border-[#ffe19e] focus:ring-1 focus:ring-[#ffe19e] transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#d0c5b2] mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1c1b1b] border border-[#4d4638] rounded-[10px] px-3 py-2.5 text-sm text-[#e5e2e1] placeholder:text-[#d0c5b2]/50 focus:outline-none focus:border-[#ffe19e] focus:ring-1 focus:ring-[#ffe19e] transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#ffe19e] text-[#3e2e00] font-semibold py-2.5 rounded-[10px] text-sm hover:bg-[#e9c46a] active:scale-95 transition-all disabled:opacity-50 mt-1"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-[#d0c5b2] text-center">
            No account?{' '}
            <Link to="/signup" className="text-[#ffe19e] hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

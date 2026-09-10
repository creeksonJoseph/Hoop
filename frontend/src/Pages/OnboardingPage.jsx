import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../hooks/useOnboarding'

export default function OnboardingPage() {
  const [key, setKey] = useState('')
  const { connect, loading } = useOnboarding()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await connect(key)
    if (!result) return
    if (result.status === 'pending_oauth') {
      const targetUrl = result.oauth_url || result.connect_url
      if (targetUrl.startsWith('http')) {
        window.location.href = targetUrl
      } else {
        window.location.href = `https://hoop-4thy.onrender.com${targetUrl}`
      }
    } else {
      navigate('/home')
    }
  }

  return (
    <div className="min-h-screen bg-[#131313] flex items-center justify-center px-4">
      <div className="w-full max-w-sm fade-up space-y-6">
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#ffe19e] flex items-center justify-center font-bold text-[#3e2e00] text-lg">H</div>
          <span className="ml-3 text-xl font-semibold text-[#e5e2e1]">Hoop</span>
        </div>

        <div className="bg-[#201f1f] border border-[#4d4638] rounded-[18px] p-6 space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-[#e5e2e1]">Connect your account</h1>
            <p className="text-xs text-[#d0c5b2] mt-1">
              Paste your Zernio API key to get started. You can find it at{' '}
              <a href="https://zernio.com" target="_blank" rel="noopener noreferrer" className="text-[#ffe19e] hover:underline">zernio.com</a>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#d0c5b2] mb-1.5">Zernio API Key</label>
              <input
                type="text" required value={key} onChange={(e) => setKey(e.target.value)}
                className="w-full bg-[#1c1b1b] border border-[#4d4638] rounded-[10px] px-3 py-2.5 text-sm text-[#e5e2e1] placeholder:text-[#d0c5b2]/50 focus:outline-none focus:border-[#ffe19e] focus:ring-1 focus:ring-[#ffe19e] transition-all font-mono"
                placeholder="sk_live_..."
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#ffe19e] text-[#3e2e00] font-semibold py-2.5 rounded-[10px] text-sm hover:bg-[#e9c46a] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Connecting…' : 'Connect →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

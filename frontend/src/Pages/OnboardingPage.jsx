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
            <h1 className="text-[18px] font-semibold text-[#191918] tracking-tight">Connect your account</h1>
            <p className="text-[13px] text-[#615d59] mt-0.5">
              Paste your Zernio API key to get started. You can find it at{' '}
              <a href="https://zernio.com" target="_blank" rel="noopener noreferrer" className="text-[#0075de] hover:underline">zernio.com</a>.
            </p>
          </div>
        </div>

        {/* Notion Tatami Light Card Container */}
        <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.06)] space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#494744] mb-1">Zernio API Key</label>
              <input
                type="text" required value={key} onChange={(e) => setKey(e.target.value)}
                className="w-full bg-white border border-[#dfdcd9] rounded-[6px] px-3 py-2 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-1 focus:ring-[#0075de] transition-colors font-mono"
                placeholder="sk_live_..."
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#0075de] hover:bg-[#005bab] text-white font-medium py-2 rounded-[6px] text-[13px] transition-colors disabled:opacity-50 mt-1 flex items-center justify-center space-x-2 shadow-sm"
            >
              {loading ? 'Connecting…' : 'Connect →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

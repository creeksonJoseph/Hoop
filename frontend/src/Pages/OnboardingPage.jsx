import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Key, Loader as Loader2, ExternalLink } from 'lucide-react'
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
      <div className="w-full max-w-[380px] space-y-6 fade-up">
        <div className="flex flex-col items-center text-center space-y-3">
          <span className="flex size-11 items-center justify-center rounded-[10px] bg-[#191918] text-lg font-bold text-white shadow-sm">
            H
          </span>
          <div>
            <h1 className="text-[20px] font-semibold text-[#191918] tracking-tight">Connect your account</h1>
            <p className="text-[13px] text-[#615d59] mt-1">
              Paste your Zernio API key to get started.{' '}
              <a href="https://zernio.com" target="_blank" rel="noopener noreferrer" className="text-[#0075de] hover:underline inline-flex items-center gap-0.5">
                zernio.com <ExternalLink size={11} />
              </a>
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.06)] space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#494744] mb-1.5">Zernio API Key</label>
              <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" strokeWidth={2} />
                <input
                  type="text" required value={key} onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all font-mono"
                  placeholder="sk_live_..."
                />
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#0075de] hover:bg-[#005bab] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm mt-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Connecting…</> : <>Connect <span>→</span></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

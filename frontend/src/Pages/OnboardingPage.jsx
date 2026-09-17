import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Key, Loader as Loader2, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react'
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
    <div className="min-h-screen h-dvh bg-[#f9f9f8] text-[#191918] font-sans flex overflow-hidden">

      {/* ── LEFT PANEL (desktop only) ─────────────────────────────── */}
      <div className="hidden md:flex md:w-[45%] lg:w-[42%] bg-[#191918] flex-col justify-between p-10 xl:p-14 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[8px] bg-white text-[#191918] text-base font-bold shadow-sm">H</span>
          <span className="text-white font-semibold text-[16px] tracking-tight">Hooop</span>
        </div>

        {/* Main copy */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-[28px] xl:text-[32px] font-semibold text-white leading-tight tracking-tight">
              Connect Instagram<br />in two steps
            </h1>
            <p className="text-[14px] text-[#a39e98] leading-relaxed max-w-[340px]">
              Hooop uses <span className="text-white font-medium">Zernio</span>,a secure third-party platform  as a bridge to your Instagram DMs. No Instagram password is ever shared with Hoop.
            </p>
          </div>

          {/* Steps */}
          <ol className="space-y-4">
            {[
              {
                n: '1',
                title: 'Get a free API key from Zernio',
                sub: 'Create an account and copy your key from the dashboard.',
                href: 'https://zernio.com/dashboard/api-keys',
                cta: 'Open Zernio API Keys',
              },
              {
                n: '2',
                title: 'Paste your key on the right',
                sub: 'Hooop will encrypt it locally and connect your account.',
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-3.5">
                <span className="flex-shrink-0 flex size-6 items-center justify-center rounded-full bg-white/10 text-white text-[11px] font-bold mt-0.5">
                  {step.n}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white leading-snug">{step.title}</p>
                  <p className="text-[12px] text-[#6b6662] mt-0.5 leading-snug">{step.sub}</p>
                  {step.href && (
                    <a
                      href={step.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-[12px] font-medium text-white/80 hover:text-white underline underline-offset-2 transition-colors"
                    >
                      {step.cta}
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Trust badge */}
          <div className="flex items-center gap-2 text-[12px] text-[#6b6662]">
            <ShieldCheck size={14} className="text-[#4c9f6f] shrink-0" />
            Your API key is AES-128 encrypted securely on our servers.
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11.5px] text-[#4a4744]">
          Hooop is not affiliated with Zernio.{' '}
          <a href="https://zernio.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#6b6662] transition-colors">
            Learn more
          </a>
        </p>
      </div>

      {/* ── RIGHT PANEL / MOBILE FULL SCREEN ──────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-5 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-[380px] space-y-5">

          {/* Mobile-only header */}
          <div className="flex flex-col items-center text-center md:hidden space-y-2 pb-1">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#191918] text-base font-bold text-white shadow-sm">H</span>
            <h1 className="text-[18px] font-semibold text-[#191918] tracking-tight">Connect Instagram</h1>
            <p className="text-[12.5px] text-[#615d59] leading-relaxed max-w-[280px]">
              Hooop uses <strong className="text-[#191918]">Zernio</strong> to connect your Instagram DMs.
              Get a free API key first.
            </p>
          </div>

          {/* Mobile-only Zernio link */}
          <a
            href="https://zernio.com/dashboard/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="md:hidden flex items-center justify-between gap-3 w-full rounded-[10px] border border-[#dfdcd9] bg-white px-4 py-3 hover:bg-[#f6f5f4] transition-colors group"
          >
            <div>
              <p className="text-[13px] font-semibold text-[#191918]">Step 1 — Get your API key</p>
              <p className="text-[11.5px] text-[#615d59] mt-0.5">zernio.com/dashboard/api-keys</p>
            </div>
            <ExternalLink size={15} className="text-[#a39e98] group-hover:text-[#0075de] transition-colors shrink-0" />
          </a>

          {/* Desktop heading above form */}
          <div className="hidden md:block">

            <h2 className="text-[18px] font-semibold text-[#191918] tracking-tight">Paste your API key</h2>
            <p className="text-[13px] text-[#615d59] mt-0.5">
              Copy your key from{' '}
              <a href="https://zernio.com/dashboard/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#0075de] hover:underline inline-flex items-center gap-0.5">
                Zernio <ExternalLink size={11} />
              </a>
              {' '}and paste it below.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.06)]">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#494744] mb-1.5">
                  Zernio API Key
                </label>
                <div className="relative">
                  <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" strokeWidth={2} />
                  <input
                    type="text"
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all font-mono"
                    placeholder="sk_live_..."
                    autoFocus
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#a39e98] flex items-center gap-1">
                  <ShieldCheck size={11} className="text-[#4c9f6f]" />
                  Encrypted and never shared
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !key.trim()}
                className="w-full bg-[#191918] hover:bg-[#333] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Connecting…</>
                  : <>Connect <ArrowRight size={14} /></>}
              </button>
            </form>
          </div>

          {/* Mobile footer */}
          <p className="text-center text-[11px] text-[#b8b4b0] md:hidden">
            Not affiliated with Zernio.{' '}
            <a href="https://zernio.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#615d59]">
              Learn more
            </a>
          </p>
        </div>
      </div>

    </div>
  )
}

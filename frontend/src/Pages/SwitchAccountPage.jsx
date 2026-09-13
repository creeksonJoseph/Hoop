import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Instagram, Loader as Loader2, Plus, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import NavRail from '../components/NavRail'
import { useSettings } from '../hooks/useSettings'
import { useAuth } from '../context/AuthContext'

export default function SwitchAccountPage() {
  const navigate = useNavigate()
  const { user, setActiveAccount } = useAuth()
  const { settings, loading } = useSettings()
  const [connecting, setConnecting] = useState(false)
  const accounts = (settings?.accounts || []).filter((account) => account.ig_username !== '__pending__')
  const activeUsername = user?.active_ig_username

  useEffect(() => {
    if (loading) return
    const available = (settings?.accounts || []).filter((account) => account.ig_username !== '__pending__')
    if (!available.length) {
      navigate('/onboarding', { replace: true })
      return
    }
    if (!activeUsername) setActiveAccount(available[0].ig_username)
  }, [loading, settings, navigate, activeUsername, setActiveAccount])

  const chooseAccount = (username) => {
    setActiveAccount(username)
    navigate('/home')
  }

  const connectAnother = () => {
    if (settings?.oauth_url) {
      setConnecting(true)
      window.location.assign(settings.oauth_url)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-[#f9f9f8] text-[#191918] font-sans">
      <NavRail activePage="settings" />
      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-2xl px-[clamp(1rem,4vw,2.5rem)] py-[clamp(1.5rem,6vw,3rem)]">
          <button onClick={() => navigate('/settings')} className="mb-8 inline-flex items-center gap-2 text-[12px] font-medium text-[#615d59] hover:text-[#191918]">
            <ArrowLeft size={15} /> Back to settings
          </button>
          <div className="mb-8">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0075de]">Workspace</p>
            <h1 className="text-[clamp(1.65rem,5vw,2.25rem)] font-semibold tracking-tight">Switch Instagram account</h1>
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#615d59]">Choose one profile to work with. Hoop keeps messages, DMs, and wingmen scoped to the selected account.</p>
          </div>
          <section className="overflow-hidden rounded-2xl border border-[#dfdcd9] bg-white shadow-sm">
            <div className="border-b border-[#f0eeec] px-5 py-4 sm:px-6">
              <h2 className="text-[14px] font-semibold">Your connected accounts</h2>
              <p className="mt-1 text-[12px] text-[#77716b]">Only one account is active at a time.</p>
            </div>
            <div className="flex flex-col gap-2 p-3 sm:p-4">
              {loading ? <div className="flex items-center gap-2 p-4 text-[12px] text-[#77716b]"><Loader2 className="animate-spin" size={15} /> Loading accounts…</div> : accounts.map((account) => {
                const isActive = account.ig_username === activeUsername
                return <button key={account.ig_username} onClick={() => chooseAccount(account.ig_username)} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${isActive ? 'border-[#0075de] bg-[#f2f8ff]' : 'border-transparent bg-[#f9f9f8] hover:border-[#dfdcd9] hover:bg-white'}`}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#191918] text-white"><Instagram size={18} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">@{account.ig_username}</span><span className="mt-0.5 block text-[11px] text-[#77716b]">Instagram profile</span></span>
                  {isActive ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0075de]"><Check size={14} /> Active</span> : <span className="text-[11px] font-medium text-[#77716b]">Switch</span>}
                </button>
              })}
              <button onClick={connectAnother} disabled={connecting || !settings?.oauth_url} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#c9c4bf] p-4 text-left text-[#0075de] transition-colors hover:border-[#0075de] hover:bg-[#f2f8ff] disabled:cursor-not-allowed disabled:opacity-60">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8f3ff]"><Plus size={18} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">Connect another account</span><span className="mt-0.5 block text-[11px] text-[#615d59]">Use your existing API key to reconnect Instagram</span></span>
                {connecting ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

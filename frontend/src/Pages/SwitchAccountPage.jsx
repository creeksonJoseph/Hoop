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
  const accounts = (settings?.accounts || []).filter((a) => a.ig_username !== '__pending__')
  const activeUsername = user?.active_ig_username

  useEffect(() => {
    if (loading) return
    const available = (settings?.accounts || []).filter((a) => a.ig_username !== '__pending__')
    if (!available.length) { navigate('/onboarding', { replace: true }); return }
    if (!activeUsername) setActiveAccount(available[0].ig_username)
  }, [loading, settings, navigate, activeUsername, setActiveAccount])

  const chooseAccount = (username) => {
    setActiveAccount(username)
    navigate('/home')
  }

  const connectAnother = () => {
    if (settings?.oauth_url) { setConnecting(true); window.location.assign(settings.oauth_url) }
  }

  return (
    <div className="min-h-screen w-full flex bg-[#f9f9f8] text-[#191918] font-sans">
      <NavRail activePage="settings" />
      <main className="min-w-0 flex-1 pt-14 pb-24 md:pt-0 md:pb-0 px-4 sm:px-6 py-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-3 md:pt-5">
          <button
            onClick={() => navigate('/settings')}
            className="flex size-8 items-center justify-center rounded-[8px] border border-[#dfdcd9] bg-white text-[#494744] hover:bg-[#f0eeec] hover:text-[#191918] transition-colors shadow-xs cursor-pointer"
          >
            <ArrowLeft size={15} strokeWidth={2} />
          </button>
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight text-[#191918]">Switch account</h1>
            <p className="text-[12px] text-[#615d59]">One profile is active at a time</p>
          </div>
        </div>

        {/* Account list */}
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-[12px] text-[#a39e98]">
            <Loader2 className="animate-spin" size={14} /> Loading accounts…
          </div>
        ) : (
          <div className="divide-y divide-[#ebebea]">
            {accounts.map((account) => {
              const isActive = account.ig_username === activeUsername
              return (
                <button
                  key={account.ig_username}
                  onClick={() => chooseAccount(account.ig_username)}
                  className={`w-full flex items-center gap-3 py-3.5 text-left transition-colors hover:text-[#191918] ${isActive ? 'text-[#191918]' : 'text-[#494744]'}`}
                >
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${isActive ? 'bg-[#191918]' : 'bg-[#f0eeec]'} transition-colors`}>
                    <Instagram size={16} className={isActive ? 'text-white' : 'text-[#615d59]'} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold truncate">@{account.ig_username}</span>
                    <span className="mt-0.5 block text-[11px] text-[#a39e98]">Instagram profile</span>
                  </span>
                  {isActive
                    ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0075de]"><Check size={13} /> Active</span>
                    : <span className="text-[11px] font-medium text-[#a39e98]">Switch</span>}
                </button>
              )
            })}

            {/* Connect another */}
            <button
              onClick={connectAnother}
              disabled={connecting || !settings?.oauth_url}
              className="w-full flex items-center gap-3 py-3.5 text-left text-[#0075de] hover:text-[#005bab] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e8f3ff]">
                <Plus size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold">Connect another account</span>
                <span className="mt-0.5 block text-[11px] text-[#615d59]">Reconnect via your API key</span>
              </span>
              {connecting ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} className="text-[#a39e98]" />}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

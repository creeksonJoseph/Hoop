import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, CircleCheck as CheckCircle2, Loader as Loader2, TriangleAlert as AlertTriangle, Unlink, ArrowLeft, LogOut, ArrowRight, UserRound } from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import NavRail from '../components/NavRail'
import { SettingsSkeleton } from '../components/skeletons/Skeletons'
import ConfirmModal from '../components/common/ConfirmModal'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { settings, loading, updateApiKey, deleteApiKey } = useSettings()
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    const ok = await updateApiKey(newKey)
    if (ok) setNewKey('')
    setSaving(false)
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your account? All wingman sessions will be revoked.')) return
    setDisconnecting(true)
    const ok = await deleteApiKey()
    if (ok) { logout(); navigate('/onboarding') }
    setDisconnecting(false)
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white text-[#191918] font-sans">
      <NavRail activePage="settings" />

      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar px-4 py-5 pt-16 pb-24 sm:px-6 md:pt-5 md:pb-6">
        <div className="max-w-lg space-y-5">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate('/home')}
              className="flex size-8 items-center justify-center rounded-[8px] border border-[#dfdcd9] bg-white text-[#494744] hover:bg-[#f6f5f4] hover:text-[#191918] transition-colors shadow-xs cursor-pointer"
              title="Back to Home"
            >
              <ArrowLeft size={16} strokeWidth={2} />
            </button>
            <h1 className="text-[18px] font-semibold text-[#191918] tracking-tight">Settings</h1>
          </div>

          {loading ? <SettingsSkeleton /> : (
            <>
              <section className="rounded-2xl border border-[#dfdcd9] bg-white p-5 shadow-sm fade-up sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8f3ff] text-[#0075de]"><UserRound size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#77716b]">Hoop profile</p>
                    <p className="mt-1 truncate text-[14px] font-semibold">{settings?.profile?.email || 'Signed-in account'}</p>
                    <p className="mt-1 text-[12px] text-[#77716b]">Your Hoop login identity</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#dfdcd9] bg-white p-5 shadow-sm fade-up sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0"><h2 className="text-[14px] font-semibold">Instagram account</h2><p className="mt-1 text-[12px] text-[#615d59]">Work with one profile at a time to keep your workspace clear.</p></div>
                  <button type="button" onClick={() => navigate('/settings/accounts')} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#dfdcd9] bg-[#f9f9f8] px-3 py-2 text-[12px] font-medium text-[#191918] hover:bg-[#f0eeec]"><span className="hidden sm:inline">Switch account</span><span className="sm:hidden">Switch</span><ArrowRight size={14} /></button>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f4fbf5] px-3 py-2.5 text-[12px] font-medium text-[#0f6220]"><CheckCircle2 size={16} /><span>Connected as @{settings?.ig_username || 'not connected'}</span></div>
              </section>

              {/* API Key section */}
              <div className="space-y-4 fade-up">
                <div>
                  <h2 className="text-[14px] font-semibold text-[#191918]">Zernio API Key</h2>
                  <p className="text-[12px] text-[#615d59] mt-0.5">
                    {settings?.masked_key
                      ? <>Current key: <span className="font-mono text-[#0075de]">{settings.masked_key}</span></>
                      : 'No API key connected'}
                  </p>
                </div>

                {settings?.ig_username && (
                  <div className="flex items-center gap-2 text-[12px] text-[#0f6220] font-medium">
                    <CheckCircle2 size={16} className="shrink-0" strokeWidth={2} />
                    <span>Connected as @{settings.ig_username}</span>
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[#494744] mb-1.5">
                      {settings?.masked_key ? 'Update API Key' : 'Add API Key'}
                    </label>
                    <input
                      type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)}
                      placeholder="sk_live_..."
                      className="w-full bg-white border border-[#dfdcd9] rounded-[8px] px-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all font-mono"
                    />
                  </div>
                  <button
                    type="submit" disabled={saving || !newKey.trim()}
                    className="w-full bg-[#0075de] hover:bg-[#005bab] text-white font-medium py-2.5 rounded-[8px] text-[12px] transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                  >
                    {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save Key'}
                  </button>
                </form>

                {settings?.oauth_url && (
                  <a
                    href={settings.oauth_url}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#f6f5f4] border border-[#dfdcd9] text-[#191918] font-medium px-4 py-2.5 rounded-[8px] text-[12px] hover:bg-[#f6f5f4] transition-colors"
                  >
                    <Link2 size={16} strokeWidth={2} />
                    Connect Instagram via OAuth
                  </a>
                )}
              </div>

              {/* Account Session & Sign Out section */}
              <div className="space-y-3 fade-up">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[14px] font-semibold text-[#191918]">Account Session</h2>
                    <p className="text-[12px] text-[#615d59] truncate">Sign out of your session on this device</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSignOutModal(true)}
                    className="bg-[#f6f5f4] hover:bg-[#fef3f1] text-[#494744] hover:text-[#e32d14] border border-[#dfdcd9] px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <LogOut size={14} strokeWidth={2} />
                    Sign out
                  </button>
                </div>
              </div>

              {/* Danger zone */}
              {settings?.has_connected_account && (
                <div className="space-y-3 fade-up">
                  <div className="flex items-center gap-2 text-[#b01601]">
                    <AlertTriangle size={18} strokeWidth={2} />
                    <h2 className="text-[14px] font-semibold text-[#b01601]">Danger Zone</h2>
                  </div>
                  <p className="text-[12px] text-[#6f0d00]">
                    Disconnecting will remove your API key and revoke all active wingman sessions.
                  </p>
                  <button
                    onClick={handleDisconnect} disabled={disconnecting}
                    className="bg-[#e32d14] text-white text-[12px] font-medium px-3.5 py-2 rounded-[8px] hover:bg-[#b01601] transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
                  >
                    {disconnecting ? <><Loader2 size={14} className="animate-spin" /> Disconnecting…</> : <><Unlink size={14} strokeWidth={2} /> Disconnect Account</>}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showSignOutModal}
        title="Sign out?"
        description="Are you sure you want to sign out of your session on this device?"
        confirmText="Sign out"
        isDestructive
        onConfirm={() => { logout(); navigate('/login') }}
        onClose={() => setShowSignOutModal(false)}
      />
    </div>
  )
}

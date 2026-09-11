import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import NavRail from '../components/NavRail'
import { SettingsSkeleton } from '../components/skeletons/Skeletons'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { settings, loading, updateApiKey, deleteApiKey } = useSettings()
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
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
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-[#f9f9f8] text-[#191918] font-sans">
      <NavRail activePage="settings" />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-20 md:pb-6">
        <h1 className="text-[18px] font-semibold text-[#191918] mb-5 tracking-tight">Settings</h1>

        {loading ? <SettingsSkeleton /> : (
          <div className="max-w-lg space-y-4">
            {/* API Key section */}
            <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-5 space-y-4 shadow-xs">
              <div>
                <h2 className="text-[14px] font-semibold text-[#191918]">Zernio API Key</h2>
                <p className="text-[12px] text-[#615d59] mt-0.5">
                  {settings?.masked_key
                    ? <>Current key: <span className="font-mono text-[#0075de]">{settings.masked_key}</span></>
                    : 'No API key connected'}
                </p>
              </div>

              {settings?.ig_username && (
                <div className="flex items-center gap-2 p-2.5 bg-[#f0faf2] border border-[#abe5b8] rounded-[6px]">
                  <span className="material-symbols-outlined text-[#14832b] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="text-[12px] text-[#0f6220] font-medium">Connected as @{settings.ig_username}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#494744] mb-1">
                    {settings?.masked_key ? 'Update API Key' : 'Add API Key'}
                  </label>
                  <input
                    type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="w-full bg-white border border-[#dfdcd9] rounded-[6px] px-3 py-2 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-1 focus:ring-[#0075de] transition-colors font-mono"
                  />
                </div>
                <button
                  type="submit" disabled={saving || !newKey.trim()}
                  className="w-full bg-[#0075de] hover:bg-[#005bab] text-white font-medium py-2 rounded-[6px] text-[12px] transition-colors disabled:opacity-50 shadow-xs"
                >
                  {saving ? 'Saving…' : 'Save Key'}
                </button>
              </form>

              {settings?.oauth_url && (
                <a
                  href={settings.oauth_url}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#0075de] text-white font-medium px-4 py-2 rounded-[6px] text-[12px] hover:bg-[#005bab] transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  Connect Instagram via OAuth
                </a>
              )}
            </div>

            {/* Danger zone */}
            {settings?.has_connected_account && (
              <div className="bg-[#fef3f1] border border-[#fdd3cd] rounded-[12px] p-5 space-y-3">
                <h2 className="text-[14px] font-semibold text-[#b01601]">Danger Zone</h2>
                <p className="text-[12px] text-[#6f0d00]">
                  Disconnecting will remove your API key and revoke all active wingman sessions.
                </p>
                <button
                  onClick={handleDisconnect} disabled={disconnecting}
                  className="bg-[#e32d14] text-white text-[12px] font-medium px-3.5 py-1.5 rounded-[6px] hover:bg-[#b01601] transition-colors disabled:opacity-50 shadow-xs"
                >
                  {disconnecting ? 'Disconnecting…' : 'Disconnect Account'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

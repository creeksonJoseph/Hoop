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
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-[#131313] text-[#e5e2e1]">
      <NavRail activePage="settings" />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-20 md:pb-6">
        <h1 className="text-lg font-semibold text-[#e5e2e1] mb-5">Settings</h1>

        {loading ? <SettingsSkeleton /> : (
          <div className="max-w-lg space-y-4">
            {/* API Key section */}
            <div className="bg-[#201f1f] border border-[#4d4638] rounded-[18px] p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-[#e5e2e1]">Zernio API Key</h2>
                <p className="text-xs text-[#d0c5b2] mt-0.5">
                  {settings?.masked_key
                    ? <>Current key: <span className="font-mono text-[#ffe19e]">{settings.masked_key}</span></>
                    : 'No API key connected'}
                </p>
              </div>

              {settings?.ig_username && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-[10px]">
                  <span className="material-symbols-outlined text-green-400 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="text-xs text-green-400 font-medium">Connected as @{settings.ig_username}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#d0c5b2] mb-1.5">
                    {settings?.masked_key ? 'Update API Key' : 'Add API Key'}
                  </label>
                  <input
                    type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)}
                    placeholder="sk_live_..."
                    className="w-full bg-[#1c1b1b] border border-[#4d4638] rounded-[10px] px-3 py-2.5 text-sm text-[#e5e2e1] placeholder:text-[#d0c5b2]/50 focus:outline-none focus:border-[#ffe19e] focus:ring-1 focus:ring-[#ffe19e] transition-all font-mono"
                  />
                </div>
                <button
                  type="submit" disabled={saving || !newKey.trim()}
                  className="w-full bg-[#ffe19e] text-[#3e2e00] font-semibold py-2.5 rounded-[10px] text-sm hover:bg-[#e9c46a] active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Key'}
                </button>
              </form>

              {settings?.oauth_url && (
                <a
                  href={settings.oauth_url}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold px-4 py-2.5 rounded-[10px] text-sm hover:opacity-90 transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  Connect Instagram via OAuth
                </a>
              )}
            </div>

            {/* Danger zone */}
            {settings?.has_connected_account && (
              <div className="bg-[#93000a]/10 border border-[#ffb4ab]/30 rounded-[18px] p-5 space-y-3">
                <h2 className="text-sm font-semibold text-[#ffb4ab]">Danger Zone</h2>
                <p className="text-xs text-[#d0c5b2]">
                  Disconnecting will remove your API key and revoke all active wingman sessions.
                </p>
                <button
                  onClick={handleDisconnect} disabled={disconnecting}
                  className="bg-[#93000a]/40 border border-[#ffb4ab]/40 text-[#ffb4ab] text-xs font-semibold px-4 py-2 rounded-[10px] hover:bg-[#93000a]/60 transition-all disabled:opacity-50"
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

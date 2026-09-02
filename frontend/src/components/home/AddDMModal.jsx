import { useState } from 'react'

export default function AddDMModal({ onAdd, onClose }) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const ok = await onAdd(username)
    setLoading(false)
    if (ok) { setUsername(''); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#201f1f] border border-[#4d4638] rounded-[18px] p-6 w-full max-w-sm shadow-2xl fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-[#e5e2e1]">Add a DM Conversation</h2>
          <button onClick={onClose} className="text-[#d0c5b2] hover:text-[#e5e2e1] transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-xs text-[#d0c5b2] mb-4">Enter the Instagram handle of the user you are chatting with.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#e5e2e1] mb-1.5">Instagram Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#d0c5b2] text-sm">@</span>
              <input
                type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full bg-[#1c1b1b] border border-[#4d4638] rounded-[10px] pl-8 pr-4 py-2.5 text-sm text-[#e5e2e1] placeholder:text-[#d0c5b2]/50 focus:outline-none focus:border-[#ffe19e] focus:ring-1 focus:ring-[#ffe19e] transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-[#2a2a2a] text-[#d0c5b2] hover:text-[#e5e2e1] border border-[#4d4638] py-2 rounded-[1rem] text-xs transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#ffe19e] text-[#3e2e00] font-semibold py-2 rounded-[1rem] text-xs hover:bg-[#e9c46a] active:scale-95 transition-all disabled:opacity-50">
              {loading ? 'Adding…' : 'Add Thread'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

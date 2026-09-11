import { useState } from 'react'
import { X, Loader as Loader2, AtSign } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm font-sans fade-in" onClick={onClose}>
      <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-[clamp(1rem,5vw,1.25rem)] w-[calc(100%-2rem)] max-w-sm shadow-xl scale-in space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-[#191918]">Add a DM Conversation</h2>
          <button onClick={onClose} aria-label="Close dialog" className="flex size-11 items-center justify-center text-[#615d59] hover:text-[#191918] transition-colors rounded-[6px] hover:bg-[#f6f5f4]">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <p className="text-[12px] text-[#615d59]">Enter the Instagram handle of the user you are chatting with.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#494744] mb-1.5">Instagram Username</label>
            <div className="relative">
              <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" strokeWidth={2} />
              <input
                type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full bg-white border border-[#dfdcd9] rounded-[8px] pl-9 pr-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
              />
            </div>
          </div>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-[#f6f5f4] text-[#494744] hover:bg-[#dfdcd9] border border-[#dfdcd9] py-2 rounded-[8px] text-[12px] font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#0075de] text-white font-medium py-2 rounded-[8px] text-[12px] hover:bg-[#005bab] transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Checking DM…</> : 'Add Thread'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


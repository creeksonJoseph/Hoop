import { useState } from 'react'
import { Plus, Users, Search, ArrowLeft, Loader as Loader2, Zap, Eye, Send, Check } from 'lucide-react'
import { useSessions } from '../../hooks/useSessions'
import WingmanGroup from '../sessions/WingmanGroup'
import { SessionsSkeleton } from '../skeletons/Skeletons'
import { useToast } from '../../context/ToastContext'

export default function ChatWingmenView({ igUsername }) {
  const { sessions, loading, generateSession, updateSession, deleteSession } = useSessions(igUsername)
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [level, setLevel] = useState('read')
  const [generating, setGenerating] = useState(false)

  const cleanUsername = igUsername ? igUsername.replace(/^@+/, '') : ''
  const formattedUsername = `@${cleanUsername}`

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setGenerating(true)
    const result = await generateSession(name.trim(), level)
    setGenerating(false)
    if (result) {
      toast('Wingman link generated', 'success')
      setName('')
      setLevel('read')
      setShowAddForm(false)
    }
  }

  // Filter sessions by query
  const filtered = sessions.filter((s) => {
    const q = query.toLowerCase()
    return (
      (s.wingman_name || '').toLowerCase().includes(q) ||
      (s.ig_username || '').toLowerCase().includes(q)
    )
  })

  // Group sessions by wingman_name
  const grouped = filtered.reduce((acc, session) => {
    const name = session.wingman_name || 'Unnamed Wingman'
    if (!acc[name]) acc[name] = []
    acc[name].push(session)
    return acc
  }, {})

  const wingmanNames = Object.keys(grouped)

  if (showAddForm) {
    return (
      <div className="flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar p-[clamp(.75rem,3vw,1rem)] bg-[#f9f9f8] flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setShowAddForm(false)}
          className="inline-flex items-center justify-center p-1 text-[#615d59] hover:text-[#191918] transition-colors cursor-pointer w-fit"
          title="Back to wingmen"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 w-full min-h-[320px] bg-white border border-[#dfdcd9] rounded-none p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#191918]">Wingman name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full sm:w-1/2 rounded-[8px] border border-[#dfdcd9] bg-white px-3 py-2 text-xs outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#191918]">Access level</label>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setLevel('read')}
                  className={`flex items-start gap-2.5 rounded-none border border-[#dfdcd9] p-3 text-left transition cursor-pointer ${
                    level === 'read' ? 'bg-[#e6f3fe]' : 'hover:bg-[#f6f5f4]'
                  }`}
                >
                  <Eye size={16} className={level === 'read' ? 'text-[#0075de] mt-0.5' : 'text-[#615d59] mt-0.5'} />
                  <div>
                    <span className="block text-xs font-semibold text-[#191918]">Read only</span>
                    <span className="block text-[11px] text-[#615d59] leading-tight">View conversations without replying.</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLevel('send')}
                  className={`flex items-start gap-2.5 rounded-none border border-[#dfdcd9] p-3 text-left transition cursor-pointer ${
                    level === 'send' ? 'bg-[#e6f3fe]' : 'hover:bg-[#f6f5f4]'
                  }`}
                >
                  <Send size={16} className={level === 'send' ? 'text-[#0075de] mt-0.5' : 'text-[#615d59] mt-0.5'} />
                  <div>
                    <span className="block text-xs font-semibold text-[#191918]">Read & reply</span>
                    <span className="block text-[11px] text-[#615d59] leading-tight">View messages and send replies for you.</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-none border border-[#dfdcd9] text-xs font-medium text-[#615d59] hover:bg-[#f6f5f4] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generating || !name.trim()}
                className="flex items-center gap-1.5 rounded-none bg-[#0075de] hover:bg-[#005bab] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {generating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Generating link…
                  </>
                ) : (
                  <>
                    <Check size={14} /> Generate wingman link
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar p-[clamp(.75rem,3vw,1rem)] bg-[#f9f9f8] flex flex-col gap-3">
      {/* Controls: Search bar on left & Add wingman button on right */}
      <div className="flex items-center justify-between gap-2.5 shrink-0">
        <div className="relative w-44 sm:w-56 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" strokeWidth={2} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wingmen…"
            className="w-full bg-white border border-[#dfdcd9] rounded-[8px] py-1.5 pl-8 pr-3 text-[12px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all shadow-xs"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[8px] bg-[#0075de] hover:bg-[#005bab] px-3 py-1.5 text-xs font-medium text-white shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={14} strokeWidth={2.5} /> Add wingman
        </button>
      </div>

      {/* Wingmen List / Full-Height Empty State */}
      <div className="flex-1 min-h-0 flex flex-col space-y-4">
        {loading ? (
          <SessionsSkeleton />
        ) : wingmanNames.length === 0 ? (
          <div className="flex-1 w-full min-h-[320px] flex flex-col items-center justify-center gap-2.5 px-6 py-12 text-center bg-white border border-[#dfdcd9] rounded-none shadow-xs">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#e6f3fe] text-[#0075de]">
              <Users size={22} />
            </div>
            <h3 className="font-semibold text-sm text-[#191918]">
              {query ? 'No matching wingmen found' : 'No wingmen for this chat'}
            </h3>
            <p className="max-w-xs text-xs text-[#615d59] leading-relaxed">
              {query
                ? `No wingman matches "${query}".`
                : `Create a wingman link to share access to ${formattedUsername} with your team or friends.`}
            </p>
          </div>
        ) : (
          wingmanNames.map((wingmanName) => (
            <WingmanGroup
              key={wingmanName}
              wingmanName={wingmanName}
              sessions={grouped[wingmanName]}
              onUpdate={updateSession}
              onDelete={deleteSession}
            />
          ))
        )}
      </div>
    </div>
  )
}

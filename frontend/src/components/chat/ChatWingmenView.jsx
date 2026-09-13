import { useState } from 'react'
import { Plus, Users, Search, ArrowLeft, Loader as Loader2, Zap, Eye, Send, Check, MoreVertical, Copy, Ban, Trash2, Share2 } from 'lucide-react'
import { useSessions } from '../../hooks/useSessions'
import { SessionsSkeleton } from '../skeletons/Skeletons'
import { useToast } from '../../context/ToastContext'

function ChatWingmanRow({ session, onUpdate, onDelete }) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loadingAction, setLoadingAction] = useState(null)
  const { toast } = useToast()

  const shareUrl = `${window.location.origin}/wingman/${session.token}`
  const wingmanName = session.wingman_name || 'Unnamed Wingman'

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast('Link copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMobileShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hooop Wingman Link (${wingmanName})`,
          text: `Wingman access link for ${wingmanName}:`,
          url: shareUrl,
        })
      } catch {
        copyLink()
      }
    } else {
      copyLink()
    }
  }

  const handleToggleAccess = async () => {
    const nextLevel = session.access_level === 'read' ? 'send' : 'read'
    setLoadingAction(nextLevel)
    setMenuOpen(false)
    try {
      await onUpdate(session.id, nextLevel)
      toast(`Access level changed to ${nextLevel === 'send' ? 'Read & reply' : 'Read only'}`, 'success')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleRevoke = async () => {
    setLoadingAction('revoked')
    setMenuOpen(false)
    try {
      await onUpdate(session.id, 'revoked')
      toast('Wingman link revoked', 'success')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleDelete = async () => {
    setLoadingAction('delete')
    setMenuOpen(false)
    try {
      await onDelete(session.id)
      toast('Wingman link deleted', 'success')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="relative flex items-center justify-between gap-3 bg-white border border-[#dfdcd9] rounded-[8px] px-3.5 py-2.5 shadow-xs hover:border-[#b4bcd0] transition-all">
      {/* Left: Wingman Avatar & Name */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <div className="size-7 rounded-full bg-[#191918] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
          {wingmanName.replace(/^@+/, '').trim()[0]?.toUpperCase() || '?'}
        </div>
        <p className="text-xs font-semibold text-[#191918] truncate max-w-[120px] sm:max-w-[160px]">{wingmanName}</p>
      </div>

      {/* Middle: Access level badge & Link preview */}
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end sm:justify-center">
        {/* Access level icon / badge */}
        {session.access_level === 'read' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-[4px] text-[#0075de] bg-[#e6f3fe] border border-[#0075de]/20 shrink-0">
            <Eye size={11} strokeWidth={2} /> Read only
          </span>
        )}
        {session.access_level === 'send' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-[4px] text-[#0f6220] bg-[#f0faf2] border border-[#abe5b8] shrink-0">
            <Send size={11} strokeWidth={2} /> Read & reply
          </span>
        )}
        {session.access_level === 'revoked' && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-[4px] text-[#b01601] bg-[#fef3f1] border border-[#fdd3cd] shrink-0">
            <Ban size={11} strokeWidth={2} /> Revoked
          </span>
        )}

        {/* Link & Copy Button */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#f9f9f8] border border-[#dfdcd9] rounded-[6px] px-2 py-0.5 text-[11px] text-[#615d59] font-mono min-w-0 max-w-[200px]">
          <span className="truncate flex-1">{session.token_preview ? `...${session.token_preview}` : shareUrl}</span>
          <button
            type="button"
            onClick={copyLink}
            className="text-[#615d59] hover:text-[#0075de] transition-colors p-0.5 shrink-0 cursor-pointer"
            title="Copy link"
          >
            {copied ? <Check size={12} className="text-[#0f6220]" /> : <Copy size={12} />}
          </button>
        </div>

        {/* Mobile Share Button */}
        <button
          type="button"
          onClick={handleMobileShare}
          className="md:hidden text-[#615d59] hover:text-[#0075de] p-1 border border-[#dfdcd9] rounded-[6px] bg-[#f9f9f8] transition-colors cursor-pointer shrink-0"
          title="Share link"
        >
          {copied ? <Check size={12} className="text-[#0f6220]" /> : <Share2 size={12} />}
        </button>
      </div>

      {/* Right: Actions Toggle Button & Dropdown */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          disabled={loadingAction !== null}
          className="p-1 rounded-[6px] text-[#615d59] hover:text-[#191918] hover:bg-[#f6f5f4] transition-colors cursor-pointer"
          title="Actions"
        >
          {loadingAction ? <Loader2 size={15} className="animate-spin text-[#0075de]" /> : <MoreVertical size={15} />}
        </button>

        {menuOpen && (
          <>
            {/* Backdrop to dismiss menu */}
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />

            <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white border border-[#dfdcd9] rounded-[8px] shadow-md py-1 text-xs font-medium text-[#191918]">
              {session.access_level !== 'revoked' && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleAccess}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#e6f3fe] text-[#0075de] flex items-center gap-2 cursor-pointer"
                  >
                    {session.access_level === 'read' ? (
                      <><Send size={13} /> Switch to Read & reply</>
                    ) : (
                      <><Eye size={13} /> Switch to Read only</>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRevoke}
                    className="w-full px-3 py-1.5 text-left hover:bg-[#fef3f1] text-[#b01601] flex items-center gap-2 cursor-pointer"
                  >
                    <Ban size={13} /> Revoke link
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleDelete}
                className="w-full px-3 py-1.5 text-left hover:bg-[#fef3f1] text-[#b01601] flex items-center gap-2 cursor-pointer border-t border-[#dfdcd9]/60"
              >
                <Trash2 size={13} /> Delete link
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

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
      <div className="flex-1 min-h-0 flex flex-col space-y-2">
        {loading ? (
          <SessionsSkeleton />
        ) : filtered.length === 0 ? (
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
          filtered.map((session) => (
            <ChatWingmanRow
              key={session.id}
              session={session}
              onUpdate={updateSession}
              onDelete={deleteSession}
            />
          ))
        )}
      </div>
    </div>
  )
}

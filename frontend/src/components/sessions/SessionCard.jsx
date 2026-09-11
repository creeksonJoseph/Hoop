import { useState } from 'react'
import { Copy, Check, Trash as Trash2, Zap, Eye, Send, Ban } from 'lucide-react'

export default function SessionCard({ session, onUpdate, onDelete }) {
  const [copied, setCopied] = useState(false)

  const levelConfig = {
    read: { label: 'Read', icon: Eye, color: 'text-[#0075de] bg-[#e6f3fe] border-[#0075de]/20' },
    send: { label: 'Send', icon: Send, color: 'text-[#0f6220] bg-[#f0faf2] border-[#abe5b8]' },
    revoked: { label: 'Revoked', icon: Ban, color: 'text-[#b01601] bg-[#fef3f1] border-[#fdd3cd]' },
  }

  const level = levelConfig[session.access_level] || levelConfig.revoked
  const LevelIcon = level.icon

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/wingman/${session.token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fluid-card w-full bg-white border border-[#dfdcd9] rounded-[12px] p-[clamp(.75rem,3vw,1rem)] space-y-3 fade-up shadow-sm font-sans">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${level.color}`}>
            <Zap size={16} strokeWidth={2} fill="currentColor" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#191918] truncate">{session.wingman_name}</p>
            <p className="text-[10px] text-[#615d59] font-mono mt-0.5">{session.token_preview}…</p>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-2 py-1 rounded-[6px] border shrink-0 flex items-center gap-1 ${level.color}`}>
          <LevelIcon size={11} strokeWidth={2} />
          {level.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {session.access_level !== 'revoked' && (
          <>
            <button
              onClick={() => onUpdate(session.id, session.access_level === 'read' ? 'send' : 'read')}
              className="min-w-[9rem] flex-1 text-[11px] font-medium bg-[#f6f5f4] border border-[#dfdcd9] hover:bg-[#dfdcd9] text-[#494744] py-1.5 rounded-[8px] transition-colors flex items-center justify-center gap-1.5"
            >
              {session.access_level === 'read' ? <><Send size={12} strokeWidth={2} /> Switch to Send</> : <><Eye size={12} strokeWidth={2} /> Switch to Read</>}
            </button>
            <button
              onClick={() => onUpdate(session.id, 'revoked')}
              className="min-w-[9rem] flex-1 text-[11px] font-medium bg-[#fef3f1] border border-[#fdd3cd] text-[#e32d14] hover:bg-[#e32d14] hover:text-white py-1.5 rounded-[8px] transition-colors flex items-center justify-center gap-1.5"
            >
              <Ban size={12} strokeWidth={2} /> Revoke
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(session.id)}
          className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#615d59] hover:text-[#e32d14] hover:bg-[#fef3f1] border border-[#dfdcd9] transition-colors shrink-0"
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-2 pt-2 border-t border-[#f0f0f0]">
        <input
          aria-label="Wingman access link"
          readOnly
          value={`${window.location.origin}/wingman/${session.token}`}
          className="flex-1 bg-[#f9f9f8] border border-[#dfdcd9] rounded-[6px] px-2.5 py-1.5 text-[10px] text-[#494744] font-mono focus:outline-none"
        />
        <button
          onClick={copyLink}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] bg-[#f6f5f4] border border-[#dfdcd9] text-[#615d59] hover:text-[#0075de] hover:bg-[#e6f3fe] transition-colors shrink-0"
        >
          {copied ? <Check size={14} className="text-[#0f6220]" strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
        </button>
      </div>
    </div>
  )
}

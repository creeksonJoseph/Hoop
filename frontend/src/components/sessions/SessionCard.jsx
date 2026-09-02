export default function SessionCard({ session, onUpdate, onDelete }) {
  const levelColor = {
    read: 'text-[#ffe19e] bg-[#ffe19e]/10 border-[#ffe19e]/30',
    send: 'text-green-400 bg-green-500/10 border-green-500/30',
    revoked: 'text-[#ffb4ab] bg-[#93000a]/20 border-[#ffb4ab]/30',
  }

  return (
    <div className="bg-[#201f1f] border border-[#4d4638] rounded-[18px] p-4 space-y-3 fade-up">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#e5e2e1] truncate">{session.wingman_name}</p>
          <p className="text-[10px] text-[#d0c5b2] font-mono mt-0.5">{session.token_preview}…</p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${levelColor[session.access_level] || levelColor.revoked}`}>
          {session.access_level}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {session.access_level !== 'revoked' && (
          <>
            <button
              onClick={() => onUpdate(session.id, session.access_level === 'read' ? 'send' : 'read')}
              className="flex-1 text-xs bg-[#2a2a2a] border border-[#4d4638] hover:border-[#ffe19e] text-[#d0c5b2] hover:text-[#e5e2e1] py-1.5 rounded-[10px] transition-all"
            >
              Switch to {session.access_level === 'read' ? 'Send' : 'Read'}
            </button>
            <button
              onClick={() => onUpdate(session.id, 'revoked')}
              className="flex-1 text-xs bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#93000a]/40 py-1.5 rounded-[10px] transition-all"
            >
              Revoke
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(session.id)}
          className="w-8 h-8 flex items-center justify-center rounded-[10px] text-[#d0c5b2] hover:text-[#ffb4ab] hover:bg-[#93000a]/20 border border-[#4d4638] transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-[#4d4638]">
        <input
          readOnly
          value={`${window.location.origin}/wingman/${session.token}`}
          className="flex-1 bg-[#1c1b1b] border border-[#4d4638] rounded-[8px] px-2.5 py-1.5 text-[10px] text-[#d0c5b2] font-mono focus:outline-none"
        />
        <button
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/wingman/${session.token}`)}
          className="w-7 h-7 flex items-center justify-center rounded-[8px] bg-[#2a2a2a] border border-[#4d4638] text-[#d0c5b2] hover:text-[#ffe19e] transition-all"
        >
          <span className="material-symbols-outlined text-[14px]">content_copy</span>
        </button>
      </div>
    </div>
  )
}

export default function SessionCard({ session, onUpdate, onDelete }) {
  const levelColor = {
    read: 'text-[#0075de] bg-[#e6f3fe] border-[#0075de]/20',
    send: 'text-[#0f6220] bg-[#f0faf2] border-[#abe5b8]',
    revoked: 'text-[#b01601] bg-[#fef3f1] border-[#fdd3cd]',
  }

  return (
    <div className="bg-white border border-[#dfdcd9] rounded-[12px] p-4 space-y-3 fade-up shadow-xs font-sans">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#191918] truncate">{session.wingman_name}</p>
          <p className="text-[10px] text-[#615d59] font-mono mt-0.5">{session.token_preview}…</p>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-[4px] border shrink-0 ${levelColor[session.access_level] || levelColor.revoked}`}>
          {session.access_level}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {session.access_level !== 'revoked' && (
          <>
            <button
              onClick={() => onUpdate(session.id, session.access_level === 'read' ? 'send' : 'read')}
              className="flex-1 text-[11px] font-medium bg-[#f6f5f4] border border-[#dfdcd9] hover:bg-[#dfdcd9] text-[#494744] py-1 rounded-[6px] transition-colors"
            >
              Switch to {session.access_level === 'read' ? 'Send' : 'Read'}
            </button>
            <button
              onClick={() => onUpdate(session.id, 'revoked')}
              className="flex-1 text-[11px] font-medium bg-[#fef3f1] border border-[#fdd3cd] text-[#e32d14] hover:bg-[#e32d14] hover:text-white py-1 rounded-[6px] transition-colors"
            >
              Revoke
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(session.id)}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#615d59] hover:text-[#e32d14] hover:bg-[#fef3f1] border border-[#dfdcd9] transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">delete</span>
        </button>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[#dfdcd9]">
        <input
          readOnly
          value={`${window.location.origin}/wingman/${session.token}`}
          className="flex-1 bg-[#f9f9f8] border border-[#dfdcd9] rounded-[4px] px-2 py-1 text-[10px] text-[#494744] font-mono focus:outline-none"
        />
        <button
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/wingman/${session.token}`)}
          className="w-6 h-6 flex items-center justify-center rounded-[4px] bg-[#f6f5f4] border border-[#dfdcd9] text-[#615d59] hover:text-[#0075de] hover:bg-[#e6f3fe] transition-colors"
        >
          <span className="material-symbols-outlined text-[13px]">content_copy</span>
        </button>
      </div>
    </div>
  )
}

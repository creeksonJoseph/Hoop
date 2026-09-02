function fmt(iso) {
  const d = new Date(iso), now = new Date()
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ msg, igUsername, onContextMenu }) {
  const isOut = msg.direction === 'outgoing'

  return (
    <div className={`flex gap-3 max-w-[85%] fade-up ${isOut ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div className={`w-8 h-8 rounded-full shrink-0 border border-[#4d4638] mt-1 flex items-center justify-center text-xs font-bold
        ${isOut ? 'bg-[#ffe19e] text-[#3e2e00] border-[#ffe19e]' : 'bg-[#353534] text-[#e5e2e1]'}`}>
        {isOut ? 'H' : igUsername[0].toUpperCase()}
      </div>
      <div className={`flex flex-col gap-1 ${isOut ? 'items-end' : ''}`}>
        <div className={`flex items-baseline gap-2 text-[10px] text-[#d0c5b2] ${isOut ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
          <span className="font-semibold text-[#e5e2e1]">{isOut ? 'You' : `@${igUsername}`}</span>
          {msg.created_at && <span>{fmt(msg.created_at)}</span>}
        </div>
        <div
          onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, msg.id) }}
          className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm cursor-context-menu
            ${isOut
              ? 'bg-[#e9c46a] border border-[#e9c46a] rounded-xl rounded-tr-sm text-[#3e2e00]'
              : 'bg-[#2a2a2a] border border-[#4d4638] rounded-xl rounded-tl-sm text-[#e5e2e1]'
            }`}
        >
          {msg.message}
          {(msg.attachments || []).map((att, i) =>
            att.type === 'image' && att.url
              ? <img key={i} src={att.url} className="max-w-[220px] rounded-lg mt-2 border border-[#4d4638]" alt="" />
              : att.url
                ? <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-[#201f1f] border border-[#4d4638] rounded-lg text-xs text-[#ffe19e] hover:underline">
                    📎 {att.payload?.title?.slice(0, 40) || att.type || 'Attachment'}
                  </a>
                : null
          )}
        </div>
      </div>
    </div>
  )
}

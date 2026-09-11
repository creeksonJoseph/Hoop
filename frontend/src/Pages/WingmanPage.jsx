import { useRef, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useWingman } from '../hooks/useWingman'
import MessageBubble from '../components/chat/MessageBubble'
import { MessagesSkeleton } from '../components/skeletons/Skeletons'

export default function WingmanPage() {
  const { token } = useParams()
  const { session, messages, loading, sendMessage } = useWingman(token)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    await sendMessage(text)
  }

  if (!loading && !session) {
    return (
      <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center text-[#615d59] text-[13px] font-sans">
        Link not found or has been removed.
      </div>
    )
  }

  const isRevoked = session?.access_level === 'revoked'
  const canSend = session?.access_level === 'send'

  return (
    <div className="h-screen w-full flex flex-col bg-[#f9f9f8] text-[#191918] overflow-hidden font-sans">
      <header className="h-14 px-4 border-b border-[#dfdcd9] flex items-center justify-between bg-white shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[6px] bg-[#191918] flex items-center justify-center font-bold text-white text-[11px]">H</div>
          <div>
            <p className="text-[14px] font-semibold text-[#191918] tracking-tight">{session?.wingman_name || '…'}</p>
            <p className="text-[11px] text-[#615d59]">@{session?.ig_username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRevoked && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-[4px] bg-[#fef3f1] border border-[#fdd3cd] text-[#e32d14]">
              Access Revoked
            </span>
          )}
          <div className="w-2 h-2 rounded-full bg-emerald-500" title="Realtime" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2.5 pb-24 bg-[#f9f9f8]">
        {loading
          ? <MessagesSkeleton />
          : messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} igUsername={session?.ig_username || ''} onContextMenu={() => {}} />
            ))
        }
        <div ref={messagesEndRef} />
      </main>

      {canSend && !isRevoked && (
        <div className="p-3 border-t border-[#dfdcd9] bg-white flex gap-2">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type a reply…"
            rows={1}
            className="flex-1 bg-white border border-[#dfdcd9] rounded-[6px] px-3 py-2 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] resize-none"
          />
          <button
            onClick={handleSend} disabled={!input.trim()}
            className="p-2 bg-[#0075de] hover:bg-[#005bab] text-white rounded-[6px] transition-colors disabled:opacity-40 shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
          </button>
        </div>
      )}

      {!canSend && !isRevoked && !loading && (
        <div className="p-3 border-t border-[#dfdcd9] bg-white text-center text-[12px] text-[#615d59]">
          Read-only access — you cannot send messages.
        </div>
      )}
    </div>
  )
}

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
      <div className="min-h-screen bg-[#131313] flex items-center justify-center text-[#d0c5b2] text-sm">
        Link not found or has been removed.
      </div>
    )
  }

  const isRevoked = session?.access_level === 'revoked'
  const canSend = session?.access_level === 'send'

  return (
    <div className="h-screen w-full flex flex-col bg-[#131313] text-[#e5e2e1] overflow-hidden">
      <header className="h-16 px-6 border-b border-[#4d4638] flex items-center justify-between bg-[#1c1b1b] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#ffe19e] flex items-center justify-center font-bold text-[#3e2e00] text-sm">H</div>
          <div>
            <p className="text-sm font-semibold text-[#e5e2e1]">{session?.wingman_name || '…'}</p>
            <p className="text-[10px] text-[#d0c5b2]">@{session?.ig_username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRevoked && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab]">
              Access Revoked
            </span>
          )}
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" title="Realtime" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3 pb-24">
        {loading
          ? <MessagesSkeleton />
          : messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} igUsername={session?.ig_username || ''} onContextMenu={() => {}} />
            ))
        }
        <div ref={messagesEndRef} />
      </main>

      {canSend && !isRevoked && (
        <div className="p-4 border-t border-[#4d4638] bg-[#131313] flex gap-2">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type a reply…"
            rows={1}
            className="flex-1 bg-[#201f1f] border border-[#4d4638] rounded-xl px-4 py-2.5 text-sm text-[#e5e2e1] placeholder:text-[#d0c5b2]/50 focus:outline-none focus:border-[#ffe19e] resize-none"
          />
          <button
            onClick={handleSend} disabled={!input.trim()}
            className="p-2.5 bg-[#ffe19e] text-[#3e2e00] rounded-xl transition-all disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
          </button>
        </div>
      )}

      {!canSend && !isRevoked && !loading && (
        <div className="p-4 border-t border-[#4d4638] text-center text-xs text-[#d0c5b2]">
          Read-only access — you cannot send messages.
        </div>
      )}
    </div>
  )
}

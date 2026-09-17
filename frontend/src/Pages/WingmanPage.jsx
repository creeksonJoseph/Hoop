import { useRef, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Send, Ban, Eye, Loader as Loader2 } from 'lucide-react'
import { useWingman } from '../hooks/useWingman'
import MessageBubble from '../components/chat/MessageBubble'
import { MessagesSkeleton } from '../components/skeletons/Skeletons'

export default function WingmanPage() {
  const { token } = useParams()
  const { session, messages, participantName, profilePicUrl, loading, sendMessage } = useWingman(token)
  const [input, setInput] = useState('')
  const [headerImgError, setHeaderImgError] = useState(false)
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
      <div className="min-h-screen bg-[#f9f9f8] flex flex-col items-center justify-center text-[#615d59] text-[13px] font-sans gap-3">
        <Ban size={32} strokeWidth={1.5} className="text-[#a39e98]" />
        <p>Link not found or has been removed.</p>
      </div>
    )
  }

  const isRevoked = session?.access_level === 'revoked'
  const canSend = session?.access_level === 'send'

  return (
    <div className="fluid-page h-[100dvh] flex flex-col bg-[#f9f9f8] text-[#191918] overflow-hidden font-sans">
      <header className="h-14 px-4 border-b border-[#dfdcd9] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          {profilePicUrl && !headerImgError ? (
            <img
              src={profilePicUrl}
              alt={session?.ig_username || 'Avatar'}
              onError={() => setHeaderImgError(true)}
              className="w-8 h-8 rounded-[8px] object-cover border border-[#0075de]/20 shrink-0 shadow-xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-[8px] bg-[#191918] flex items-center justify-center font-bold text-white text-[12px]">H</div>
          )}
          <div>
            <p className="text-[14px] font-semibold text-[#191918] tracking-tight">{participantName || session?.ig_username || '…'}</p>
            <p className="text-[11px] text-[#615d59]">@{session?.ig_username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isRevoked && (
            <span className="text-[10px] font-medium px-2 py-1 rounded-[6px] bg-[#fef3f1] border border-[#fdd3cd] text-[#e32d14] flex items-center gap-1">
              <Ban size={11} strokeWidth={2} /> Access Revoked
            </span>
          )}
        </div>
      </header>

      <main className="min-w-0 flex-1 overflow-y-auto custom-scrollbar p-[clamp(.75rem,3vw,1rem)] flex flex-col gap-2.5 pb-24 bg-[#f9f9f8]">
        {loading
          ? <MessagesSkeleton />
          : messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} igUsername={session?.ig_username || ''} avatarUrl={profilePicUrl} onContextMenu={() => {}} />
            ))
        }
        <div ref={messagesEndRef} />
      </main>

      {canSend && !isRevoked && (
        <div className="p-3 border-t border-[#dfdcd9] bg-white flex gap-2 items-end">
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type a reply…"
            rows={1}
            className="flex-1 bg-white border border-[#dfdcd9] rounded-[10px] px-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 resize-none transition-all"
          />
          <button
            onClick={handleSend} disabled={!input.trim()}
            className="p-2.5 bg-[#0075de] hover:bg-[#005bab] text-white rounded-[8px] transition-colors disabled:opacity-40 shadow-sm shrink-0"
          >
            <Send size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {!canSend && !isRevoked && !loading && (
        <div className="p-3 border-t border-[#dfdcd9] bg-white text-center text-[12px] text-[#615d59] flex items-center justify-center gap-2">
          <Eye size={14} strokeWidth={2} className="text-[#a39e98]" />
          Read-only access - you cannot send messages.
        </div>
      )}
    </div>
  )
}

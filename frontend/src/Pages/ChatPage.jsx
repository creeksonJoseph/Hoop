import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useChat } from '../hooks/useChat'
import MessageBubble from '../components/chat/MessageBubble'
import WingmanBar from '../components/chat/WingmanBar'
import { MessagesSkeleton } from '../components/skeletons/Skeletons'

export default function ChatPage() {
  const { igUsername } = useParams()
  const { messages, loading, wsStatus, sendMessage, deleteMessage } = useChat(igUsername)
  const [input, setInput] = useState('')
  const [ctxMenu, setCtxMenu] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    await sendMessage(text)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleContextMenu = (e, msgId) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, msgId })
  }

  const handleDelete = async () => {
    if (!ctxMenu) return
    await deleteMessage(ctxMenu.msgId)
    setCtxMenu(null)
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#131313] text-[#e5e2e1] overflow-hidden relative"
      onClick={() => setCtxMenu(null)}>

      {/* Header */}
      <header className="h-16 px-6 border-b border-[#4d4638] flex items-center justify-between bg-[#1c1b1b] shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/home"
            className="w-8 h-8 flex items-center justify-center rounded-[1rem] bg-[#2a2a2a] border border-[#4d4638] text-[#d0c5b2] hover:text-[#e5e2e1] hover:border-[#ffe19e] transition-all">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </Link>
          <div className="w-9 h-9 rounded-full bg-[#ffe19e]/20 border border-[#4d4638] flex items-center justify-center font-bold text-sm text-[#ffe19e] shrink-0">
            {igUsername[0].toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-[#e5e2e1] truncate">@{igUsername}</h2>
              <span className="material-symbols-outlined text-[#ffe19e] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/sessions/${igUsername}`}
            className="flex items-center gap-1 bg-[#201f1f] border border-[#4d4638] hover:border-[#ffe19e] text-[#ffe19e] px-2.5 py-1 rounded-[1rem] text-[11px] transition-all">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <span className="hidden sm:inline">Sessions</span>
          </Link>
          <div className={`w-2.5 h-2.5 rounded-full transition-colors ${wsStatus === 'connected' ? 'bg-green-500' : 'bg-[#d0c5b2]/40'}`} title="WebSocket status" />
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3 pb-56">
        {loading
          ? <MessagesSkeleton />
          : messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} igUsername={igUsername} onContextMenu={handleContextMenu} />
            ))
        }
        <div ref={messagesEndRef} />
      </main>

      {/* Bottom command bar */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-3 bg-gradient-to-t from-[#131313] via-[#131313]/95 to-transparent flex flex-col gap-2.5 z-40">
        <WingmanBar igUsername={igUsername} onUseSuggestion={(t) => setInput(t)} />
        <div className="relative w-full flex items-center bg-[#201f1f] border border-[#4d4638] focus-within:border-[#ffe19e] focus-within:ring-1 focus-within:ring-[#ffe19e] rounded-xl transition-all shadow-lg">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a reply… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="w-full bg-transparent border-none focus:ring-0 text-[#e5e2e1] py-3 px-4 resize-none custom-scrollbar max-h-28 text-sm placeholder:text-[#d0c5b2]/50 outline-none"
            style={{ minHeight: '44px' }}
          />
          <div className="flex items-center pr-2 shrink-0">
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 bg-[#ffe19e] text-[#3e2e00] rounded-lg transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="fixed z-50 bg-[#2a2a2a] border border-[#4d4638] rounded-xl shadow-2xl overflow-hidden min-w-[160px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[#ffb4ab] hover:bg-[#93000a]/30 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            Delete Message
          </button>
        </div>
      )}
    </div>
  )
}

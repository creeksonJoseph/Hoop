import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Send, Zap, Trash as Trash2, BadgeCheck } from 'lucide-react'
import { useChat } from '../hooks/useChat'
import NavRail from '../components/NavRail'
import MessageBubble from '../components/chat/MessageBubble'
import { MessagesSkeleton } from '../components/skeletons/Skeletons'

export default function ChatPage() {
  const { igUsername } = useParams()
  const { messages, loading, sendMessage, deleteMessage } = useChat(igUsername)
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
    <div className="h-[100dvh] w-full flex overflow-hidden bg-white text-[#191918] font-sans relative">
      <NavRail activePage="home" />

      <div className="flex-1 h-full flex flex-col overflow-hidden pb-14 md:pb-0">
        {/* Header */}
        <header className="h-14 px-4 border-b border-[#dfdcd9] flex items-center justify-between bg-white shrink-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/home"
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-[8px] bg-white border border-[#dfdcd9] text-[#494744] hover:text-[#191918] hover:bg-[#f6f5f4] transition-colors">
              <ArrowLeft size={16} strokeWidth={2} />
            </Link>
            <div className="w-8 h-8 rounded-[8px] bg-[#e6f3fe] border border-[#0075de]/20 flex items-center justify-center font-bold text-xs text-[#0075de] shrink-0">
              {igUsername[0].toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <h2 className="text-[14px] font-semibold text-[#191918] truncate">@{igUsername}</h2>
                <BadgeCheck size={15} className="text-[#0075de]" fill="currentColor" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/sessions/${igUsername}`}
              className="flex items-center gap-1.5 bg-[#f6f5f4] border border-[#dfdcd9] hover:bg-[#e6f3fe] text-[#0075de] px-2.5 py-1.5 rounded-[8px] text-[11px] font-medium transition-colors">
              <Zap size={14} strokeWidth={2} fill="currentColor" />
              <span className="hidden sm:inline">Sessions</span>
            </Link>
            <div className="w-2 h-2 rounded-full bg-emerald-500" title="Realtime" />
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2.5 pb-24 bg-[#f9f9f8]" onClick={() => setCtxMenu(null)}>
          {loading
            ? <MessagesSkeleton />
            : messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} igUsername={igUsername} onContextMenu={handleContextMenu} />
              ))
          }
          <div ref={messagesEndRef} />
        </main>

        {/* Input bar */}
        <div className="px-4 pb-4 pt-3 border-t border-[#dfdcd9] bg-white z-40">
          <div className="relative w-full flex items-center bg-white border border-[#dfdcd9] focus-within:border-[#0075de] focus-within:ring-2 focus-within:ring-[#0075de]/15 rounded-[10px] transition-all shadow-sm">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a reply… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="w-full bg-transparent border-none focus:ring-0 text-[#191918] py-2.5 px-3.5 resize-none custom-scrollbar max-h-28 text-[13px] placeholder:text-[#a39e98] outline-none"
              style={{ minHeight: '40px' }}
            />
            <div className="flex items-center pr-2 shrink-0">
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2 bg-[#0075de] hover:bg-[#005bab] text-white rounded-[8px] transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <Send size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* Context menu */}
        {ctxMenu && (
          <div
            className="fixed z-50 bg-white border border-[#dfdcd9] rounded-[10px] shadow-lg overflow-hidden min-w-[160px] font-sans scale-in"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleDelete}
              className="w-full text-left px-3.5 py-2.5 text-[12px] font-medium text-[#e32d14] hover:bg-[#fef3f1] transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} strokeWidth={2} />
              Delete Message
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

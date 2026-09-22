import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ArrowLeft, Send, Trash as Trash2, Loader as Loader2 } from 'lucide-react'

import { useChat } from '../../hooks/useChat'
import MessageBubble from './MessageBubble'
import { MessagesSkeleton } from '../skeletons/Skeletons'
import ChatWingmenView from './ChatWingmenView'
import Instagram24hNotice from './Instagram24hNotice'
import { get24hWindowStatus } from '../../utils/instagramWindow'

export default function ChatView({ igUsername }) {
  const { messages, participantName, profilePicUrl, loading, sendMessage, deleteMessage, hasMore, loadingMore, loadMore } = useChat(igUsername)
  const [input, setInput] = useState('')
  const [headerImgError, setHeaderImgError] = useState(false)
  const [viewMode, setViewMode] = useState('messages')
  const [ctxMenu, setCtxMenu] = useState(null)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const mainRef = useRef(null)
  const isInitialLoad = useRef(true)
  const paginationAnchorRef = useRef(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const displayName = participantName && participantName.toLowerCase() !== igUsername.toLowerCase()
    ? participantName
    : null

  const windowStatus = get24hWindowStatus(messages, participantName || igUsername)

  // Scroll to bottom on initial message load
  useEffect(() => {
    if (!loading && messages.length > 0 && isInitialLoad.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      isInitialLoad.current = false
    }
  }, [loading, messages])

  // Reset initial load flag when username changes
  useEffect(() => {
    isInitialLoad.current = true
  }, [igUsername])

  // Preserve the user's viewport when older messages are prepended.
  const previousMessageCountRef = useRef(0)
  useEffect(() => {
    const container = mainRef.current
    const anchor = paginationAnchorRef.current
    if (!container || !anchor) return

    if (messages.length > previousMessageCountRef.current) {
      requestAnimationFrame(() => {
        const heightDelta = container.scrollHeight - anchor.scrollHeight
        container.scrollTop = anchor.scrollTop + heightDelta
        paginationAnchorRef.current = null
      })
    } else if (!loadingMore) {
      paginationAnchorRef.current = null
    }

    previousMessageCountRef.current = messages.length
  }, [messages, loadingMore])

  const handleScroll = () => {
    const container = mainRef.current
    if (!container || loading || loadingMore || !hasMore || !loadMore) return
    if (paginationAnchorRef.current !== null) return // already loading, don't double-fire

    // Trigger loading older messages when near top (< 120px).
    if (container.scrollTop < 120) {
      paginationAnchorRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      }
      loadMore()
    }
  }

  const handleSend = async () => {
    if (!input.trim() || windowStatus.isExpired) return
    const text = input
    setInput('')
    await sendMessage(text, { isExpired: windowStatus.isExpired })
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
    <div className="flex-1 h-full flex flex-col min-w-0 bg-[#f9f9f8] text-[#191918] font-sans relative overflow-hidden">
      {/* Header */}
      <header className="px-4 border-b border-[#dfdcd9] flex items-center justify-between bg-white shrink-0 z-30 pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-0 md:h-14">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/home"
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-[8px] bg-white border border-[#dfdcd9] text-[#494744] hover:text-[#191918] hover:bg-[#f6f5f4] transition-colors">
            <ArrowLeft size={16} strokeWidth={2} />
          </Link>
          {profilePicUrl && !headerImgError ? (
            <img
              src={profilePicUrl}
              alt={igUsername}
              onError={() => setHeaderImgError(true)}
              className="w-8 h-8 rounded-[8px] object-cover border border-[#0075de]/20 shrink-0 shadow-xs"
            />
          ) : (
            <div className="w-8 h-8 rounded-[8px] bg-[#e6f3fe] border border-[#0075de]/20 flex items-center justify-center font-bold text-xs text-[#0075de] shrink-0">
              {(participantName || igUsername || '').replace(/^@+/, '').trim()[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <h2 className="text-[14px] font-semibold text-[#191918] truncate">
                {displayName || `@${igUsername}`}
              </h2>
            </div>
            {displayName && (
              <p className="text-[11px] text-[#615d59] font-mono leading-none">@{igUsername}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setViewMode((prev) => (prev === 'messages' ? 'wingmen' : 'messages'))}
            className="flex items-center gap-1.5 bg-[#f6f5f4] border border-[#dfdcd9] hover:bg-[#e6f3fe] text-[#000000] px-3 py-1.5 rounded-[6px] text-base font-medium transition-colors cursor-pointer shrink-0"
          >
            {viewMode === 'messages' ? 'Wingman' : 'Chats'}
          </button>
        </div>
      </header>

      {viewMode === 'wingmen' ? (
        <ChatWingmenView igUsername={igUsername} />
      ) : (
        <>
          {/* Messages */}
          <main
            ref={mainRef}
            onScroll={handleScroll}
            className="min-w-0 flex-1 overflow-y-auto custom-scrollbar p-[clamp(.75rem,3vw,1rem)] flex flex-col gap-2.5 pb-24 bg-[#f9f9f8]"
            onClick={() => setCtxMenu(null)}
          >
            {loadingMore && (
              <div className="flex items-center justify-center py-2 text-[12px] text-[#615d59] gap-2 shrink-0">
                <Loader2 size={14} className="animate-spin text-[#0075de]" />
                <span>Loading older messages…</span>
              </div>
            )}
            {loading
              ? <MessagesSkeleton />
              : messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} igUsername={igUsername} avatarUrl={profilePicUrl} onContextMenu={handleContextMenu} />
              ))
            }
            <div ref={messagesEndRef} />
          </main>

          {/* Instagram 24-hour Messaging Policy Warning */}
          <Instagram24hNotice
            warningText={windowStatus.warningText}
            isExpired={windowStatus.isExpired}
            isExpiringSoon={windowStatus.isExpiringSoon}
          />

          {/* Input bar */}
          <div className="px-[clamp(.75rem,3vw,1rem)] pb-4 pt-3 border-t border-[#dfdcd9] bg-white z-40">
            <div className="relative w-full flex items-center bg-white border border-[#dfdcd9] focus-within:border-[#0075de] focus-within:ring-2 focus-within:ring-[#0075de]/15 rounded-[10px] transition-all shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={windowStatus.isExpired}
                placeholder={
                  windowStatus.isExpired
                    ? (displayName ? `Messaging window closed — waiting for ${displayName} to reply…` : `Messaging window closed — waiting for @${igUsername} to reply…`)
                    : (isMobile ? 'Type a reply…' : 'Type a reply… (Enter to send, Shift+Enter for newline)')
                }
                rows={1}
                className="w-full bg-transparent border-none focus:ring-0 text-[#191918] py-2.5 px-3.5 resize-none custom-scrollbar max-h-28 text-[13px] placeholder:text-[#a39e98] outline-none disabled:bg-[#f6f5f4] disabled:text-[#a39e98] disabled:cursor-not-allowed"
                style={{ minHeight: '40px' }}
              />
              <div className="flex items-center pr-2 shrink-0">
                <button
                  onClick={handleSend}
                  disabled={windowStatus.isExpired || !input.trim()}
                  className="p-2 bg-[#0075de] hover:bg-[#005bab] text-white rounded-[8px] transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <Send size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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
  )
}

import { useState } from 'react'
import { ExternalLink, Film, Paperclip, Sparkles, Mic, Smile } from 'lucide-react'

function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  if (isNaN(d.getTime())) return ''
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g

function isReelUrl(url) {
  return /instagram\.com\/(reel|reels|p)\//i.test(url) || /instagr\.am\/(reel|p)\//i.test(url)
}

export default function MessageBubble({ msg, igUsername, avatarUrl, onContextMenu }) {
  const isOut = msg.direction === 'outgoing'
  const text = (msg.message || '').trim()
  const attachments = msg.attachments || []
  const [imgError, setImgError] = useState(false)

  const match = text.match(URL_REGEX)
  const textUrl = match ? match[0] : null
  const attUrl = attachments.find(a => a.url)?.url
  const primaryUrl = textUrl || attUrl
  const isReel = primaryUrl && isReelUrl(primaryUrl)

  const isStory =
    msg.type === 'story_share' ||
    msg.type === 'story_mention' ||
    text.toLowerCase().includes('instagram story') ||
    text.toLowerCase().includes('replied to your story') ||
    attachments.some(a => a.type === 'story_share' || a.type === 'story_mention' || a.type === 'story' || (a.payload?.title || '').toLowerCase().includes('story'))

  const hasImage = attachments.some(a => a.type === 'image' && a.url)
  const hasGenericUrl = attachments.some(a => a.url && !isReelUrl(a.url))
  const hasRenderableContent = Boolean(text || isReel || isStory || hasImage || hasGenericUrl)

  return (
    <div className={`flex gap-2.5 max-w-[92%] sm:max-w-[85%] fade-up font-sans ${isOut ? 'self-end flex-row-reverse' : 'self-start'}`}>
      {!isOut && avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={igUsername}
          onError={() => setImgError(true)}
          className="w-7 h-7 rounded-[8px] object-cover shrink-0 border border-[#0075de]/20 mt-0.5 shadow-xs"
        />
      ) : (
        <div className={`w-7 h-7 rounded-[8px] shrink-0 border flex items-center justify-center text-[11px] font-bold mt-0.5
          ${isOut ? 'bg-[#191918] text-white border-[#191918]' : 'bg-[#e6f3fe] text-[#0075de] border-[#0075de]/20'}`}>
          {isOut ? 'H' : (((msg.sender_name || igUsername || '').replace(/^@+/, '').trim()[0]?.toUpperCase()) || '?')}
        </div>
      )}

      <div className={`flex flex-col gap-0.5 ${isOut ? 'items-end' : ''}`}>
        <div className={`flex items-baseline gap-2 text-[10px] text-[#615d59] ${isOut ? 'mr-1 flex-row-reverse' : 'ml-1'}`}>
          <span className="font-semibold text-[#191918]">{isOut ? 'You' : `@${igUsername}`}</span>
          {msg.created_at && <span>{fmt(msg.created_at)}</span>}
        </div>

        <div
          onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, msg.id) }}
          className={`overflow-hidden text-[13px] leading-relaxed shadow-sm cursor-context-menu transition-colors
            ${isOut
              ? 'bg-[#0075de] text-white border border-[#0075de] rounded-[12px] rounded-tr-[4px]'
              : 'bg-white border border-[#dfdcd9] text-[#191918] rounded-[12px] rounded-tl-[4px]'
            }`}
        >
          {isReel ? (
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`block p-3 transition-colors ${
                isOut ? 'hover:bg-[#0068c7] text-white' : 'hover:bg-[#f6f5f4] text-[#191918]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-[12px] mb-1">
                <Film size={14} strokeWidth={2} />
                <span>Instagram Reel</span>
                <ExternalLink size={12} strokeWidth={2} />
              </div>
              {text && !text.startsWith('http') && (
                <p className="text-[12px] opacity-90 mb-1 line-clamp-2">{text}</p>
              )}
              <span className={`text-[11px] underline font-mono opacity-85 block truncate ${isOut ? 'text-white' : 'text-[#0075de]'}`}>
                {primaryUrl}
              </span>
            </a>
          ) : isStory ? (
            <div className={`p-3 min-w-[180px] ${isOut ? 'bg-[#0075de] text-white' : 'bg-white text-[#191918]'}`}>
              <div className="flex items-center gap-1.5 font-semibold text-[12px] mb-1">
                <Sparkles size={14} strokeWidth={2} className={isOut ? 'text-white' : 'text-[#e1306c]'} />
                <span className={isOut ? 'text-white' : 'text-[#e1306c]'}>Instagram Story</span>
              </div>
              <p className="text-[12px] font-medium opacity-90">
                {text || 'Shared an Instagram Story'}
              </p>
              <span className={`text-[10px] block mt-1 opacity-75 ${isOut ? 'text-white/80' : 'text-[#615d59]'}`}>
                Viewable directly on Instagram
              </span>
            </div>
          ) : !hasRenderableContent ? (
            <div className={`px-3.5 py-2.5 flex items-center gap-2 text-[12px] font-medium ${isOut ? 'text-white' : 'text-[#615d59]'}`}>
              {msg.type === 'voice' || msg.type === 'audio' ? <Mic size={14} strokeWidth={2} /> : msg.type === 'sticker' ? <Smile size={14} strokeWidth={2} /> : <Paperclip size={14} strokeWidth={2} />}
              <span>{msg.type === 'voice' || msg.type === 'audio' ? 'Voice message' : msg.type === 'sticker' ? 'Sent a sticker' : 'Shared media / attachment'}</span>
            </div>
          ) : (
            <div className="px-3.5 py-2">
              {text && (
                <p className="whitespace-pre-wrap break-words">
                  {text.split(URL_REGEX).map((part, i) =>
                    URL_REGEX.test(part) ? (
                      <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`underline font-medium ${isOut ? 'text-white' : 'text-[#0075de]'}`}
                      >
                        {part}
                      </a>
                    ) : (
                      part
                    )
                  )}
                </p>
              )}

              {attachments.map((att, i) =>
                att.type === 'image' && att.url ? (
                  <img
                    key={i}
                    src={att.url}
                    className="max-w-[240px] rounded-[8px] mt-1.5 border border-black/10"
                    alt="Attachment"
                  />
                ) : att.url && !isReel ? (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-medium underline ${
                      isOut ? 'text-white' : 'text-[#0075de]'
                    }`}
                  >
                    <Paperclip size={12} strokeWidth={2} />
                    {att.payload?.title || att.type || 'View Attachment'}
                    <ExternalLink size={10} strokeWidth={2} />
                  </a>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


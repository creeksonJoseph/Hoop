import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Trash as Trash2, MessageCircle, Zap } from 'lucide-react'

export default function DMList({ dms, onDelete }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const filtered = dms.filter((d) =>
    (d.ig_username || '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-sans">
      <div className="p-3 shrink-0">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" strokeWidth={2} />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#f9f9f8] border border-[#dfdcd9] rounded-[8px] py-2 pl-9 pr-3 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
            placeholder="Search conversations..."
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 px-2 pb-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-[#a39e98] text-[12px] py-10 gap-2">
            <MessageCircle size={28} strokeWidth={1.5} className="opacity-40" />
            <span>No conversations yet</span>
          </div>
        )}
        {filtered.map((dm) => (
          <div
            key={dm.ig_username}
            className="group flex min-h-11 items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 hover:bg-[#f6f5f4] cursor-pointer transition-colors"
            onClick={() => navigate(`/chat/${dm.ig_username}`)}
          >
            <div className="w-9 h-9 rounded-[8px] bg-[#e6f3fe] border border-[#0075de]/20 flex items-center justify-center font-semibold text-[13px] text-[#0075de] shrink-0">
              {dm.ig_username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#191918] truncate">@{dm.ig_username}</p>
              {dm.session_count > 0 && (
                <p className="text-[10px] text-[#615d59] flex items-center gap-1 mt-0.5">
                  <Zap size={10} className="text-[#0075de]" strokeWidth={2} />
                  {dm.session_count} wingman{dm.session_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(dm.ig_username) }}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-[6px] text-[#615d59] hover:text-[#e32d14] hover:bg-[#fef3f1] transition-all"
            >
              <Trash2 size={15} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

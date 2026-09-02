import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DMList({ dms, onDelete }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const filtered = dms.filter((d) =>
    (d.ig_username || '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="p-3 shrink-0">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#d0c5b2] text-[18px]">search</span>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#201f1f] border border-[#4d4638] rounded-md py-2 pl-9 pr-4 text-sm text-[#e5e2e1] placeholder:text-[#d0c5b2]/60 focus:outline-none focus:border-[#ffe19e] focus:ring-1 focus:ring-[#ffe19e] transition-all"
            placeholder="Search conversations..."
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 px-2 pb-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-[#d0c5b2] text-xs py-10 gap-2">
            <span className="material-symbols-outlined text-[32px] opacity-40">forum</span>
            <span>No conversations yet</span>
          </div>
        )}
        {filtered.map((dm) => (
          <div
            key={dm.ig_username}
            className="group flex items-center gap-3 px-3 py-3 rounded-[10px] hover:bg-[#201f1f] cursor-pointer transition-colors"
            onClick={() => navigate(`/chat/${dm.ig_username}`)}
          >
            <div className="w-9 h-9 rounded-full bg-[#ffe19e]/20 border border-[#4d4638] flex items-center justify-center font-semibold text-sm text-[#ffe19e] shrink-0">
              {dm.ig_username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#e5e2e1] truncate">@{dm.ig_username}</p>
              {dm.session_count > 0 && (
                <p className="text-[10px] text-[#d0c5b2]">{dm.session_count} wingman session{dm.session_count !== 1 ? 's' : ''}</p>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(dm.ig_username) }}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-[#d0c5b2] hover:text-[#ffb4ab] hover:bg-[#93000a]/30 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

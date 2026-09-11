import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Trash as Trash2, MessageCircle, Zap } from 'lucide-react'
import ConfirmModal from '../common/ConfirmModal'

export default function DMList({ dms, onDelete, activeUsername }) {
  const [query, setQuery] = useState('')
  const [deletingDM, setDeletingDM] = useState(null)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const navigate = useNavigate()

  const filtered = dms.filter((d) =>
    (d.ig_username || '').toLowerCase().includes(query.toLowerCase())
  )

  const handleConfirmDelete = async () => {
    if (!deletingDM) return
    setLoadingDelete(true)
    try {
      await onDelete(deletingDM)
      setDeletingDM(null)
    } finally {
      setLoadingDelete(false)
    }
  }

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
        {filtered.map((dm) => {
          const isActive = activeUsername && activeUsername.toLowerCase() === dm.ig_username.toLowerCase()
          return (
            <div
              key={dm.ig_username}
              className={`group flex min-h-11 items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[#e6f3fe] border border-[#0075de]/20'
                  : 'hover:bg-[#f6f5f4] border border-transparent'
              }`}
              onClick={() => navigate(`/chat/${dm.ig_username}`)}
            >
              <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center font-semibold text-[13px] shrink-0 ${
                isActive ? 'bg-[#0075de] text-white' : 'bg-[#e6f3fe] text-[#0075de] border border-[#0075de]/20'
              }`}>
                {dm.ig_username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-medium truncate ${isActive ? 'text-[#0075de]' : 'text-[#191918]'}`}>
                  @{dm.ig_username}
                </p>
                {dm.session_count > 0 && (
                  <p className="text-[10px] text-[#615d59] flex items-center gap-1 mt-0.5">
                    <Zap size={10} className="text-[#0075de]" strokeWidth={2} />
                    {dm.session_count} wingman{dm.session_count !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setDeletingDM(dm.ig_username) }}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-[6px] text-[#615d59] hover:text-[#e32d14] hover:bg-[#fef3f1] transition-all cursor-pointer"
                title="Delete Conversation"
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        isOpen={Boolean(deletingDM)}
        title="Delete Conversation?"
        description={`Are you sure you want to delete @${deletingDM}? This will remove the tracked thread and revoke associated wingman links.`}
        confirmText="Delete Thread"
        isDestructive={true}
        loading={loadingDelete}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingDM(null)}
      />
    </div>
  )
}


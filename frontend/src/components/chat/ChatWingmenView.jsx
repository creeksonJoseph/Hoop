import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, Search } from 'lucide-react'
import { useSessions } from '../../hooks/useSessions'
import WingmanGroup from '../sessions/WingmanGroup'
import { SessionsSkeleton } from '../skeletons/Skeletons'

export default function ChatWingmenView({ igUsername }) {
  const { sessions, loading, updateSession, deleteSession } = useSessions(igUsername)
  const [query, setQuery] = useState('')

  const cleanUsername = igUsername ? igUsername.replace(/^@+/, '') : ''
  const formattedUsername = `@${cleanUsername}`

  // Filter sessions by query
  const filtered = sessions.filter((s) => {
    const q = query.toLowerCase()
    return (
      (s.wingman_name || '').toLowerCase().includes(q) ||
      (s.ig_username || '').toLowerCase().includes(q)
    )
  })

  // Group sessions by wingman_name
  const grouped = filtered.reduce((acc, session) => {
    const name = session.wingman_name || 'Unnamed Wingman'
    if (!acc[name]) acc[name] = []
    acc[name].push(session)
    return acc
  }, {})

  const wingmanNames = Object.keys(grouped)

  return (
    <div className="flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar p-[clamp(.75rem,3vw,1rem)] bg-[#f9f9f8] flex flex-col gap-3">
      {/* Controls: Search bar on left & Add wingman button on right */}
      <div className="flex items-center justify-between gap-2.5 shrink-0">
        <div className="relative w-44 sm:w-56 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" strokeWidth={2} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wingmen…"
            className="w-full bg-white border border-[#dfdcd9] rounded-[8px] py-1.5 pl-8 pr-3 text-[12px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all shadow-xs"
          />
        </div>

        <Link
          to={`/sessions/${cleanUsername}/new`}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[8px] bg-[#0075de] hover:bg-[#005bab] px-3 py-1.5 text-xs font-medium text-white shadow-xs transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} /> Add wingman
        </Link>
      </div>

      {/* Wingmen List / Full-Height Empty State */}
      <div className="flex-1 min-h-0 flex flex-col space-y-4">
        {loading ? (
          <SessionsSkeleton />
        ) : wingmanNames.length === 0 ? (
          <div className="flex-1 w-full min-h-[320px] flex flex-col items-center justify-center gap-2.5 px-6 py-12 text-center bg-white border border-[#dfdcd9] rounded-none shadow-xs">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#e6f3fe] text-[#0075de]">
              <Users size={22} />
            </div>
            <h3 className="font-semibold text-sm text-[#191918]">
              {query ? 'No matching wingmen found' : 'No wingmen for this chat'}
            </h3>
            <p className="max-w-xs text-xs text-[#615d59] leading-relaxed">
              {query
                ? `No wingman matches "${query}".`
                : `Create a wingman link to share access to ${formattedUsername} with your team or friends.`}
            </p>
            {!query && (
              <Link
                to={`/sessions/${cleanUsername}/new`}
                className="mt-2 inline-flex items-center gap-1.5 rounded-[8px] bg-[#0075de] hover:bg-[#005bab] px-3.5 py-2 text-xs font-medium text-white shadow-xs"
              >
                <Plus size={14} /> Add wingman
              </Link>
            )}
          </div>
        ) : (
          wingmanNames.map((wingmanName) => (
            <WingmanGroup
              key={wingmanName}
              wingmanName={wingmanName}
              sessions={grouped[wingmanName]}
              onUpdate={updateSession}
              onDelete={deleteSession}
            />
          ))
        )}
      </div>
    </div>
  )
}

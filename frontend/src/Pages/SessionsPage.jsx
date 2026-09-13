import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Users, Search } from 'lucide-react'
import { useSessions } from '../hooks/useSessions'
import NavRail from '../components/NavRail'
import WingmanGroup from '../components/sessions/WingmanGroup'
import { SessionsSkeleton } from '../components/skeletons/Skeletons'

export default function SessionsPage() {
  const { igUsername } = useParams()
  const navigate = useNavigate()
  const isChatSpecific = Boolean(igUsername && igUsername !== 'all')
  const cleanUsername = igUsername ? igUsername.replace(/^@+/, '') : ''
  const formattedUsername = `@${cleanUsername}`

  const { sessions, loading, updateSession, deleteSession } = useSessions(igUsername)
  const [query, setQuery] = useState('')

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
    <div className="min-h-screen flex bg-background text-foreground font-sans">
      <NavRail activePage={isChatSpecific ? 'chat' : 'sessions'} />

      <main className="fluid-page min-w-0 flex-1 flex flex-col pt-12 pb-20 md:pt-0 md:pb-0">
        <div className="w-full flex-1 flex flex-col p-[clamp(.75rem,3vw,1.5rem)] gap-4">
          {/* Page Header with Back Button */}
          <header className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(isChatSpecific ? `/chat/${cleanUsername}` : '/home')}
                className="flex size-8 items-center justify-center rounded-[8px] border border-[#dfdcd9] bg-white text-[#494744] hover:bg-[#f6f5f4] hover:text-[#191918] transition-colors shadow-xs cursor-pointer"
                title={isChatSpecific ? `Back to ${formattedUsername}` : "Back to Home"}
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </button>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[#191918]">
                  {isChatSpecific ? formattedUsername : 'Wingmen'}
                </h1>
                <p className="text-xs text-[#615d59]">
                  {isChatSpecific ? `sessions shared under ${formattedUsername}` : 'Manage all shared Instagram DM access'}
                </p>
              </div>
            </div>

            {/* Search + Add Wingman Action */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 sm:w-64 min-w-[14rem]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a39e98]" strokeWidth={2} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search wingmen or DMs…"
                  className="w-full bg-white border border-[#dfdcd9] rounded-[8px] py-2 pl-9 pr-3 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all shadow-xs"
                />
              </div>

              <Link
                to={`/sessions/${igUsername || 'all'}/new`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#0075de] hover:bg-[#005bab] px-3.5 py-2 text-xs font-medium text-white shadow-xs transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} /> Add wingman
              </Link>
            </div>
          </header>

          {/* Grouped Wingmen List / Full Cover Empty State */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
            {loading ? (
              <SessionsSkeleton />
            ) : wingmanNames.length === 0 ? (
              <div className="flex-1 w-full min-h-[380px] flex flex-col items-center justify-center gap-3 px-5 py-12 text-center bg-white border border-[#dfdcd9] rounded-none shadow-xs">
                <div className="flex size-12 items-center justify-center rounded-xl bg-[#e6f3fe] text-[#0075de]">
                  <Users size={24} />
                </div>
                <h3 className="font-semibold text-sm text-[#191918]">
                  {query ? 'No matching wingmen found' : 'No wingmen yet'}
                </h3>
                <p className="max-w-sm text-xs text-[#615d59] leading-relaxed">
                  {query
                    ? `No wingman or DM matches "${query}".`
                    : 'Create a wingman link to share access to specific DMs with your team or assistants.'}
                </p>
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
      </main>
    </div>
  )
}

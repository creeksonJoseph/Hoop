import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Users, Search, UserCheck } from 'lucide-react'
import { useSessions } from '../hooks/useSessions'
import NavRail from '../components/NavRail'
import SessionCard from '../components/sessions/SessionCard'
import { SessionsSkeleton } from '../components/skeletons/Skeletons'

export default function SessionsPage() {
  const { igUsername } = useParams()
  const { sessions, loading, updateSession, deleteSession } = useSessions(igUsername)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

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
      <NavRail activePage="sessions" />

      <main className="fluid-page min-w-0 flex-1 pb-20 md:pb-0">
        <div className="fluid-content py-[clamp(1.25rem,4vw,2rem)] max-w-4xl mx-auto">
          {/* Page Header with Back Button */}
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/home')}
                className="flex size-8 items-center justify-center rounded-[8px] border border-[#dfdcd9] bg-white text-[#494744] hover:bg-[#f6f5f4] hover:text-[#191918] transition-colors shadow-xs cursor-pointer"
                title="Back to Home"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </button>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[#191918]">Wingmen</h1>
                <p className="text-xs text-[#615d59]">
                  {igUsername && igUsername !== 'all' ? `Filtered by @${igUsername}` : 'Manage all shared Instagram DM access'}
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
                  className="w-full bg-white border border-[#dfdcd9] rounded-[8px] py-2 pl-9 pr-3 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
                />
              </div>

              <Link
                to={`/sessions/${igUsername || 'all'}/new`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#0075de] hover:bg-[#005bab] px-3.5 py-2 text-xs font-medium text-white shadow-sm transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} /> Add wingman
              </Link>
            </div>
          </header>

          {/* Grouped Wingmen List */}
          <div className="space-y-6">
            {loading ? (
              <SessionsSkeleton />
            ) : wingmanNames.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-5 py-16 text-center bg-white border border-[#dfdcd9] rounded-[12px]">
                <div className="flex size-12 items-center justify-center rounded-xl bg-[#e6f3fe] text-[#0075de]">
                  <Users size={24} />
                </div>
                <h3 className="font-semibold text-sm text-[#191918]">
                  {query ? 'No matching wingmen found' : 'No wingmen yet'}
                </h3>
                <p className="max-w-sm text-xs text-[#615d59]">
                  {query
                    ? `No wingman or DM matches "${query}".`
                    : 'Create a wingman link to share access to specific DMs with your team or assistants.'}
                </p>
                {!query && (
                  <Link
                    to={`/sessions/${igUsername || 'all'}/new`}
                    className="mt-2 inline-flex items-center gap-2 rounded-[8px] bg-[#0075de] hover:bg-[#005bab] px-3.5 py-2 text-xs font-medium text-white shadow-xs"
                  >
                    <Plus size={15} /> Add your first wingman
                  </Link>
                )}
              </div>
            ) : (
              wingmanNames.map((wingmanName) => {
                const items = grouped[wingmanName]
                return (
                  <div key={wingmanName} className="bg-white border border-[#dfdcd9] rounded-[12px] shadow-xs overflow-hidden">
                    {/* Wingman Group Header */}
                    <div className="flex items-center justify-between border-b border-[#dfdcd9] px-5 py-3.5 bg-[#f9f9f8]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[8px] bg-[#191918] text-white flex items-center justify-center font-semibold text-xs">
                          {wingmanName[0].toUpperCase()}
                        </div>
                        <div>
                          <h2 className="font-semibold text-[15px] text-[#191918]">{wingmanName}</h2>
                          <p className="text-[11px] text-[#615d59]">
                            {items.length} shared DM{items.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-[6px] bg-[#e6f3fe] text-[#0075de] border border-[#0075de]/20 flex items-center gap-1">
                          <UserCheck size={12} /> Wingman
                        </span>
                      </div>
                    </div>

                    {/* DMs listed under this Wingman */}
                    <div className="p-4 space-y-3 bg-white">
                      {items.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onUpdate={updateSession}
                          onDelete={deleteSession}
                        />
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

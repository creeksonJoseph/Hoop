import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Zap } from 'lucide-react'
import { useSessions } from '../hooks/useSessions'
import NavRail from '../components/NavRail'
import SessionCard from '../components/sessions/SessionCard'
import { SessionsSkeleton } from '../components/skeletons/Skeletons'

export default function SessionsPage() {
  const { igUsername } = useParams()
  const { sessions, loading, updateSession, deleteSession } = useSessions(igUsername)

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white text-[#191918] font-sans">
      <NavRail activePage="sessions" />

      <div className="flex-1 h-full flex flex-col overflow-hidden pb-14 md:pb-0">
        <header className="h-14 px-4 border-b border-[#dfdcd9] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <Link to={`/chat/${igUsername}`}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-[8px] bg-white border border-[#dfdcd9] text-[#494744] hover:text-[#191918] hover:bg-[#f6f5f4] transition-colors">
              <ArrowLeft size={16} strokeWidth={2} />
            </Link>
            <div>
              <h1 className="text-[15px] font-semibold text-[#191918] tracking-tight">Wingman Sessions</h1>
              <p className="text-[11px] text-[#615d59]">@{igUsername}</p>
            </div>
          </div>
          <Link to={`/sessions/${igUsername}/new`}
            className="flex items-center gap-1.5 bg-[#0075de] hover:bg-[#005bab] text-white px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors shadow-sm">
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">Add Wingman</span>
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 max-w-lg mx-auto w-full">
          {loading
            ? <SessionsSkeleton />
            : sessions.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <div className="w-14 h-14 rounded-[12px] bg-[#f9f9f8] border border-[#dfdcd9] flex items-center justify-center text-[#a39e98]">
                    <Zap size={28} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#191918]">No wingmen yet</p>
                    <p className="text-[12px] text-[#615d59] mt-0.5">Generate a link to share access with a wingman.</p>
                  </div>
                  <Link to={`/sessions/${igUsername}/new`}
                    className="flex items-center gap-1.5 bg-[#0075de] hover:bg-[#005bab] text-white px-3.5 py-2 rounded-[8px] text-[12px] font-medium transition-colors shadow-sm mt-2">
                    <Plus size={14} strokeWidth={2.5} />
                    Add Wingman
                  </Link>
                </div>
              )
              : sessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onUpdate={updateSession}
                    onDelete={deleteSession}
                  />
                ))
          }
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useDMs } from '../hooks/useDMs'
import NavRail from '../components/NavRail'
import DMList from '../components/home/DMList'
import AddDMModal from '../components/home/AddDMModal'
import { DMListSkeleton } from '../components/skeletons/Skeletons'
import { Link } from 'react-router-dom'

export default function HomePage() {
  const { dms, hasRealAccount, loading, addDM, deleteDM } = useDMs()
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-[#131313] text-[#e5e2e1]">
      <NavRail activePage="home" />

      <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden pb-16 md:pb-0">
        {/* Conversation list column */}
        <div className="w-full md:w-[340px] h-full flex flex-col bg-[#131313] border-r border-[#4d4638] shrink-0 z-10">
          <div className="h-16 px-3 border-b border-[#4d4638] flex justify-between items-center shrink-0">
            <h1 className="font-semibold text-[#e5e2e1]">Conversations</h1>
            <button
              onClick={() => hasRealAccount ? setShowModal(true) : window.location.href = '/settings'}
              className="flex items-center gap-1.5 bg-[#ffe19e] hover:bg-[#e9c46a] text-[#3e2e00] px-3 py-1.5 rounded-[1rem] text-xs font-semibold transition-all shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Thread
            </button>
          </div>

          {!hasRealAccount && !loading && (
            <div className="p-3 bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-300 text-xs flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[18px] text-yellow-400 shrink-0">warning</span>
                <span className="truncate">Connect Instagram to track DMs</span>
              </div>
              <Link to="/settings" className="bg-[#ffe19e] text-[#3e2e00] font-semibold text-[11px] px-2.5 py-1 rounded hover:opacity-90 transition-all shrink-0">
                Connect ↗
              </Link>
            </div>
          )}

          {loading ? <DMListSkeleton /> : <DMList dms={dms} onDelete={deleteDM} />}
        </div>

        {/* Empty canvas */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#131313] p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#2a2a2a] border border-[#4d4638] flex items-center justify-center mb-4 text-[#ffe19e]">
            <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
          </div>
          <h2 className="font-semibold text-[#e5e2e1] mb-1">Select a Conversation</h2>
          <p className="text-xs text-[#d0c5b2] max-w-sm">
            Choose an Instagram thread from the list to view messages and generate AI Wingman suggestions.
          </p>
        </div>
      </div>

      {showModal && <AddDMModal onAdd={addDM} onClose={() => setShowModal(false)} />}
    </div>
  )
}

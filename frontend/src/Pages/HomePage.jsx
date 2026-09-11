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
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white text-[#191918] font-sans">
      <NavRail activePage="home" />

      <div className="flex-1 h-full flex flex-col md:flex-row overflow-hidden pb-14 md:pb-0">
        {/* Conversation list column */}
        <div className="w-full md:w-[320px] h-full flex flex-col bg-white border-r border-[#dfdcd9] shrink-0 z-10">
          <div className="h-14 px-4 border-b border-[#dfdcd9] flex justify-between items-center shrink-0">
            <h1 className="font-semibold text-[15px] text-[#191918] tracking-tight">Conversations</h1>
            <button
              onClick={() => hasRealAccount ? setShowModal(true) : window.location.href = '/settings'}
              className="flex items-center gap-1 bg-[#0075de] hover:bg-[#005bab] text-white px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              New Thread
            </button>
          </div>

          {!hasRealAccount && !loading && (
            <div className="p-3 bg-[#fff5e0] border-b border-[#ffe4af] text-[#704b00] text-[12px] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[16px] text-[#c78600] shrink-0">warning</span>
                <span className="truncate">Connect Instagram to track DMs</span>
              </div>
              <Link to="/settings" className="bg-[#c78600] text-white font-medium text-[11px] px-2 py-0.5 rounded-[4px] hover:bg-[#a16c00] transition-colors shrink-0">
                Connect ↗
              </Link>
            </div>
          )}

          {loading ? <DMListSkeleton /> : <DMList dms={dms} onDelete={deleteDM} />}
        </div>

        {/* Empty canvas */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#f9f9f8] p-12 text-center">
          <div className="w-14 h-14 rounded-[12px] bg-white border border-[#dfdcd9] flex items-center justify-center mb-3 text-[#0075de] shadow-sm">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
          </div>
          <h2 className="font-semibold text-[16px] text-[#191918] mb-1 tracking-tight">Select a Conversation</h2>
          <p className="text-[13px] text-[#615d59] max-w-sm leading-relaxed">
            Choose an Instagram thread from the sidebar to view real-time messages and generate AI Wingman suggestions.
          </p>
        </div>
      </div>

      {showModal && <AddDMModal onAdd={addDM} onClose={() => setShowModal(false)} />}
    </div>
  )
}

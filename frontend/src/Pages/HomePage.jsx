import { useEffect, useState } from 'react'
import { Plus, MessageCircle, CircleAlert as AlertCircle, ArrowRight } from 'lucide-react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useDMs } from '../hooks/useDMs'
import NavRail from '../components/NavRail'
import DMList from '../components/home/DMList'
import AddDMModal from '../components/home/AddDMModal'
import { DMListSkeleton } from '../components/skeletons/Skeletons'
import ChatView from '../components/chat/ChatView'

export default function HomePage() {
  const { igUsername } = useParams()
  const { dms, hasRealAccount, loading, addDM, deleteDM } = useDMs()
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  // Auto-clear active chat pane if the selected DM is deleted or removed
  useEffect(() => {
    if (igUsername && !loading && Array.isArray(dms)) {
      const exists = dms.some(
        (d) => (d.ig_username || '').toLowerCase() === igUsername.toLowerCase()
      )
      if (!exists && dms.length >= 0) {
        navigate('/home', { replace: true })
      }
    }
  }, [igUsername, dms, loading, navigate])


  return (
    <div className="h-screen h-dvh w-full flex overflow-hidden bg-[#f9f9f8] text-[#191918] font-sans">
      <NavRail activePage="home" />

      <div className="flex-1 h-full w-full flex overflow-hidden pb-16 md:pb-0 bg-[#f9f9f8]">
        {/* Conversation list column (sidebar) */}
        <div className={`w-full md:w-[clamp(18rem,34vw,22rem)] h-full min-w-0 flex flex-col bg-white border-r border-[#dfdcd9] shrink-0 z-10 ${igUsername ? 'hidden md:flex' : 'flex'}`}>
          <div className="h-14 px-4 border-b border-[#dfdcd9] flex justify-between items-center shrink-0 bg-white">
            <h1 className="font-semibold text-[15px] text-[#191918] tracking-tight">Conversations</h1>
            <button
              onClick={() => hasRealAccount ? setShowModal(true) : window.location.href = '/settings'}
              className="flex items-center gap-1.5 bg-[#0075de] hover:bg-[#005bab] text-white px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors shadow-sm"
            >
              <Plus size={14} strokeWidth={2.5} />
              New Thread
            </button>
          </div>

          {!hasRealAccount && !loading && (
            <div className="p-3 bg-[#fff5e0] border-b border-[#ffe4af] text-[#704b00] text-[12px] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle size={16} className="text-[#c78600] shrink-0" strokeWidth={2} />
                <span className="truncate">Connect Instagram to track DMs</span>
              </div>
              <Link to="/settings" className="bg-[#c78600] text-white font-medium text-[11px] px-2 py-1 rounded-[6px] hover:bg-[#a16c00] transition-colors shrink-0 flex items-center gap-1">
                Connect <ArrowRight size={11} />
              </Link>
            </div>
          )}

          {loading ? <DMListSkeleton /> : <DMList dms={dms} onDelete={deleteDM} activeUsername={igUsername} />}
        </div>

        {/* Right pane: ChatView if igUsername selected, else Empty canvas */}
        <div className={`flex-1 h-full min-h-full min-w-0 ${igUsername ? 'flex' : 'hidden md:flex'}`}>
          {igUsername ? (
            <ChatView igUsername={igUsername} />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center bg-[#f9f9f8] p-12 text-center">
              <div className="w-16 h-16 rounded-[14px] bg-white border border-[#dfdcd9] flex items-center justify-center mb-4 text-[#0075de] shadow-sm">
                <MessageCircle size={30} strokeWidth={1.5} />
              </div>
              <h2 className="font-semibold text-[16px] text-[#191918] mb-1 tracking-tight">Select a Conversation</h2>
              <p className="text-[13px] text-[#615d59] max-w-sm leading-relaxed">
                Choose a conversation from the sidebar to open it in this tab.
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && <AddDMModal onAdd={addDM} onClose={() => setShowModal(false)} />}
    </div>
  )
}

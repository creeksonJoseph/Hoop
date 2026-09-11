import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader as Loader2, Zap, Eye, Send, Check } from 'lucide-react'
import { useSessions } from '../hooks/useSessions'
import NavRail from '../components/NavRail'
import { useToast } from '../context/ToastContext'

export default function AddSessionPage() {
  const { igUsername } = useParams()
  const { generateSession } = useSessions(igUsername)
  const navigate = useNavigate()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [level, setLevel] = useState('read')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setGenerating(true)
    const result = await generateSession(name.trim(), level)
    setGenerating(false)
    if (result) {
      toast('Wingman link generated', 'success')
      navigate(`/sessions/${igUsername}`)
    }
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white text-[#191918] font-sans">
      <NavRail activePage="sessions" />

      <div className="flex-1 h-full flex flex-col overflow-hidden pb-14 md:pb-0">
        <header className="h-14 px-4 border-b border-[#dfdcd9] flex items-center gap-3 shrink-0 bg-white">
          <Link to={`/sessions/${igUsername}`}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-white border border-[#dfdcd9] text-[#494744] hover:text-[#191918] hover:bg-[#f6f5f4] transition-colors">
            <ArrowLeft size={16} strokeWidth={2} />
          </Link>
          <h1 className="text-[15px] font-semibold text-[#191918] tracking-tight">Add Wingman</h1>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 max-w-lg mx-auto w-full">
          <form onSubmit={handleGenerate} className="bg-white border border-[#dfdcd9] rounded-[12px] p-5 space-y-5 shadow-sm fade-up">
            <div className="flex items-center gap-2.5 pb-1">
              <div className="w-9 h-9 rounded-[8px] bg-[#e6f3fe] border border-[#0075de]/20 flex items-center justify-center text-[#0075de]">
                <Zap size={18} strokeWidth={2} fill="currentColor" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-[#191918]">Generate Wingman Link</h2>
                <p className="text-[11px] text-[#615d59]">For @{igUsername}</p>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#494744] mb-1.5">Wingman Name</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John, Assistant, Coach..."
                className="w-full bg-white border border-[#dfdcd9] rounded-[8px] px-3 py-2.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-2 focus:ring-[#0075de]/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#494744] mb-1.5">Access Level</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setLevel('read')}
                  className={`flex flex-col items-center gap-1.5 p-3.5 rounded-[10px] border-2 transition-all ${
                    level === 'read'
                      ? 'border-[#0075de] bg-[#e6f3fe] text-[#0075de]'
                      : 'border-[#dfdcd9] bg-white text-[#615d59] hover:bg-[#f6f5f4]'
                  }`}
                >
                  <Eye size={20} strokeWidth={2} />
                  <span className="text-[12px] font-semibold">Read Only</span>
                  <span className="text-[10px] opacity-80">Can view messages</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLevel('send')}
                  className={`flex flex-col items-center gap-1.5 p-3.5 rounded-[10px] border-2 transition-all ${
                    level === 'send'
                      ? 'border-[#0f6220] bg-[#f0faf2] text-[#0f6220]'
                      : 'border-[#dfdcd9] bg-white text-[#615d59] hover:bg-[#f6f5f4]'
                  }`}
                >
                  <Send size={20} strokeWidth={2} />
                  <span className="text-[12px] font-semibold">Send & Read</span>
                  <span className="text-[10px] opacity-80">Can view & reply</span>
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={generating || !name.trim()}
              className="w-full bg-[#0075de] hover:bg-[#005bab] text-white font-medium py-2.5 rounded-[8px] text-[13px] transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
            >
              {generating ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Check size={15} strokeWidth={2.5} /> Generate Link</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

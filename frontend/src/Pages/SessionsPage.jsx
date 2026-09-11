import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import SessionCard from '../components/sessions/SessionCard'
import { SessionsSkeleton } from '../components/skeletons/Skeletons'

export default function SessionsPage() {
  const { igUsername } = useParams()
  const { sessions, loading, generateSession, updateSession, deleteSession } = useSessions(igUsername)
  const [name, setName] = useState('')
  const [level, setLevel] = useState('read')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setGenerating(true)
    await generateSession(name.trim(), level)
    setName('')
    setGenerating(false)
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#f9f9f8] text-[#191918] overflow-hidden font-sans">
      <header className="h-14 px-4 border-b border-[#dfdcd9] flex items-center gap-3 shrink-0 bg-white shadow-2xs">
        <Link to={`/chat/${igUsername}`}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] bg-white border border-[#dfdcd9] text-[#494744] hover:text-[#191918] hover:bg-[#f6f5f4] transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-[15px] font-semibold text-[#191918] tracking-tight">Wingman Sessions</h1>
          <p className="text-[11px] text-[#615d59]">@{igUsername}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Generate form */}
        <form onSubmit={handleGenerate} className="bg-white border border-[#dfdcd9] rounded-[12px] p-4 space-y-3 shadow-xs">
          <h2 className="text-[14px] font-semibold text-[#191918]">Generate Wingman Link</h2>
          <div className="flex gap-2">
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Wingman name"
              className="flex-1 bg-white border border-[#dfdcd9] rounded-[6px] px-3 py-1.5 text-[13px] text-[#191918] placeholder:text-[#a39e98] focus:outline-none focus:border-[#0075de] focus:ring-1 focus:ring-[#0075de] transition-colors"
            />
            <select
              value={level} onChange={(e) => setLevel(e.target.value)}
              className="bg-white border border-[#dfdcd9] rounded-[6px] px-3 py-1.5 text-[13px] text-[#191918] focus:outline-none focus:border-[#0075de] transition-colors cursor-pointer"
            >
              <option value="read">Read</option>
              <option value="send">Send</option>
            </select>
          </div>
          <button
            type="submit" disabled={generating || !name.trim()}
            className="w-full bg-[#0075de] hover:bg-[#005bab] text-white font-medium py-1.5 rounded-[6px] text-[12px] transition-colors disabled:opacity-50 shadow-xs"
          >
            {generating ? 'Generating…' : 'Generate Link'}
          </button>
        </form>

        {/* Sessions list */}
        {loading
          ? <SessionsSkeleton />
          : sessions.length === 0
            ? <div className="text-center text-[12px] text-[#615d59] py-8">No sessions yet. Generate one above.</div>
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
  )
}

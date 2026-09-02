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
    <div className="h-screen w-full flex flex-col bg-[#131313] text-[#e5e2e1] overflow-hidden">
      <header className="h-16 px-6 border-b border-[#4d4638] flex items-center gap-3 shrink-0 bg-[#1c1b1b]">
        <Link to={`/chat/${igUsername}`}
          className="w-8 h-8 flex items-center justify-center rounded-[1rem] bg-[#2a2a2a] border border-[#4d4638] text-[#d0c5b2] hover:text-[#e5e2e1] hover:border-[#ffe19e] transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-sm font-semibold text-[#e5e2e1]">Wingman Sessions</h1>
          <p className="text-[10px] text-[#d0c5b2]">@{igUsername}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Generate form */}
        <form onSubmit={handleGenerate} className="bg-[#201f1f] border border-[#4d4638] rounded-[18px] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#e5e2e1]">Generate Wingman Link</h2>
          <div className="flex gap-2">
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Wingman name"
              className="flex-1 bg-[#1c1b1b] border border-[#4d4638] rounded-[10px] px-3 py-2 text-sm text-[#e5e2e1] placeholder:text-[#d0c5b2]/50 focus:outline-none focus:border-[#ffe19e] transition-all"
            />
            <select
              value={level} onChange={(e) => setLevel(e.target.value)}
              className="bg-[#1c1b1b] border border-[#4d4638] rounded-[10px] px-3 py-2 text-sm text-[#e5e2e1] focus:outline-none focus:border-[#ffe19e] transition-all"
            >
              <option value="read">Read</option>
              <option value="send">Send</option>
            </select>
          </div>
          <button
            type="submit" disabled={generating || !name.trim()}
            className="w-full bg-[#ffe19e] text-[#3e2e00] font-semibold py-2 rounded-[10px] text-sm hover:bg-[#e9c46a] active:scale-95 transition-all disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate Link'}
          </button>
        </form>

        {/* Sessions list */}
        {loading
          ? <SessionsSkeleton />
          : sessions.length === 0
            ? <div className="text-center text-xs text-[#d0c5b2] py-8">No sessions yet. Generate one above.</div>
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

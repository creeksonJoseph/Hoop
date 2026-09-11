import { useState } from 'react'
import api from '../../lib/api'

const DEFAULTS = [
  { label: 'Playful Pivot', text: "Hey! Thanks for reaching out. Let me check and get back to you." },
  { label: 'Direct Confirmation', text: "That works for me! Sounds great." },
  { label: 'Follow-Up', text: "Awesome, I'll keep you posted once I have an update!" },
]

export default function WingmanBar({ igUsername, onUseSuggestion }) {
  const [suggestions, setSuggestions] = useState(DEFAULTS)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/wingman/suggest', { params: { username: igUsername } })
      if (data.suggestions?.length) setSuggestions(data.suggestions)
    } catch {
      setSuggestions(DEFAULTS)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#131313] border border-[#4d4638] rounded-xl p-3 shadow-2xl flex flex-col gap-2 backdrop-blur-md">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#ffe19e] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          <span className="text-[10px] text-[#d0c5b2] tracking-wider uppercase font-semibold">Wingman Suggestions</span>
        </div>
        <button onClick={refresh} className="text-[#d0c5b2] hover:text-[#ffe19e] transition-colors text-[11px] flex items-center gap-1">
          <span className={`material-symbols-outlined text-[14px] ${loading ? 'spin' : ''}`}>refresh</span>
          <span>Refresh</span>
        </button>
      </div>
      <div className="flex max-w-full flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onUseSuggestion(s.text || s)}
            className="bg-[#2a2a2a] hover:bg-[#353534] border border-[#4d4638] hover:border-[#ffe19e] text-[#e5e2e1] text-[11px] px-3 py-1.5 rounded-[1rem] transition-all flex items-center gap-1.5"
          >
            <span className="text-[#ffe19e] opacity-70">[</span>
            {s.label || s.text || s}
            <span className="text-[#ffe19e] opacity-70">]</span>
          </button>
        ))}
      </div>
    </div>
  )
}

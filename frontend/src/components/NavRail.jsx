import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavRail({ activePage }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const navItem = (href, icon, label, active) => (
    <Link
      to={href}
      title={label}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 cursor-pointer active:scale-95 group relative
        ${active
          ? 'text-[#ffe19e] bg-[#2a2a2a] border border-[#ffe19e]'
          : 'text-[#d0c5b2] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]'
        }`}
    >
      <span className="material-symbols-outlined" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
      <div className="absolute left-full ml-3 px-2 py-1 bg-[#353534] border border-[#4d4638] rounded text-xs text-[#e5e2e1] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
        {label}
      </div>
    </Link>
  )

  return (
    <>
      {/* Desktop rail */}
      <nav className="w-[60px] h-full hidden md:flex flex-col bg-[#131313] border-r border-[#4d4638] shrink-0 py-6 items-center justify-between z-20">
        <div className="flex flex-col items-center gap-12 w-full">
          <Link to="/home" className="w-8 h-8 rounded-full bg-[#ffe19e] flex items-center justify-center font-semibold text-[#3e2e00] cursor-pointer hover:scale-105 transition-transform shrink-0">
            H
          </Link>
          <div className="flex flex-col items-center gap-4 w-full px-2">
            {navItem('/home', 'forum', 'Conversations', activePage === 'home')}
            {navItem('/settings', 'settings', 'Settings', activePage === 'settings')}
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[#d0c5b2] hover:text-[#ffb4ab] hover:bg-[#2a2a2a] transition-colors cursor-pointer active:scale-95 group relative"
        >
          <span className="material-symbols-outlined">logout</span>
          <div className="absolute left-full ml-3 px-2 py-1 bg-[#353534] border border-[#4d4638] rounded text-xs text-[#e5e2e1] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
            Sign Out
          </div>
        </button>
      </nav>

      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#131313]/95 backdrop-blur-2xl border-t border-[#4d4638] z-50 flex items-center justify-around px-4 md:hidden">
        <Link to="/home" className={`flex flex-col items-center justify-center transition-all ${activePage === 'home' ? 'text-[#ffe19e] font-bold' : 'text-[#d0c5b2]'}`}>
          <span className="material-symbols-outlined text-[20px]" style={activePage === 'home' ? { fontVariationSettings: "'FILL' 1" } : {}}>forum</span>
          <span className="text-[10px] mt-0.5">DMs</span>
        </Link>
        <Link to="/settings" className={`flex flex-col items-center justify-center transition-all ${activePage === 'settings' ? 'text-[#ffe19e]' : 'text-[#d0c5b2]'}`}>
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span className="text-[10px] mt-0.5">Settings</span>
        </Link>
        <button onClick={handleLogout} className="flex flex-col items-center justify-center text-[#d0c5b2] hover:text-[#ffb4ab] transition-all">
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="text-[10px] mt-0.5">Logout</span>
        </button>
      </nav>
    </>
  )
}

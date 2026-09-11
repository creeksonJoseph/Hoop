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
      className={`w-9 h-9 rounded-[6px] flex items-center justify-center transition-colors duration-150 cursor-pointer group relative
        ${active
          ? 'text-[#0075de] bg-[#e6f3fe] border border-[#0075de]/20 font-medium'
          : 'text-[#615d59] hover:text-[#191918] hover:bg-[#f6f5f4]'
        }`}
    >
      <span className="material-symbols-outlined text-[20px]" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{icon}</span>
      <div className="absolute left-full ml-2 px-2 py-1 bg-[#191918] border border-[#31302e] rounded-[4px] text-[11px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-sm transition-opacity duration-150">
        {label}
      </div>
    </Link>
  )

  return (
    <>
      {/* Desktop rail */}
      <nav className="w-[56px] h-full hidden md:flex flex-col bg-white border-r border-[#dfdcd9] shrink-0 py-4 items-center justify-between z-20 font-sans">
        <div className="flex flex-col items-center gap-8 w-full">
          <Link to="/home" className="w-7 h-7 rounded-[6px] bg-[#191918] flex items-center justify-center font-bold text-white text-xs cursor-pointer hover:bg-[#31302e] transition-colors shrink-0">
            H
          </Link>
          <div className="flex flex-col items-center gap-2 w-full px-2">
            {navItem('/home', 'forum', 'Conversations', activePage === 'home')}
            {navItem('/settings', 'settings', 'Settings', activePage === 'settings')}
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="w-9 h-9 rounded-[6px] flex items-center justify-center text-[#615d59] hover:text-[#e32d14] hover:bg-[#fef3f1] transition-colors cursor-pointer group relative"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#191918] border border-[#31302e] rounded-[4px] text-[11px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-sm transition-opacity duration-150">
            Sign Out
          </div>
        </button>
      </nav>

      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-[#dfdcd9] z-50 flex items-center justify-around px-4 md:hidden font-sans">
        <Link to="/home" className={`flex flex-col items-center justify-center transition-all ${activePage === 'home' ? 'text-[#0075de] font-semibold' : 'text-[#615d59]'}`}>
          <span className="material-symbols-outlined text-[18px]" style={activePage === 'home' ? { fontVariationSettings: "'FILL' 1" } : {}}>forum</span>
          <span className="text-[10px] mt-0.5">DMs</span>
        </Link>
        <Link to="/settings" className={`flex flex-col items-center justify-center transition-all ${activePage === 'settings' ? 'text-[#0075de] font-semibold' : 'text-[#615d59]'}`}>
          <span className="material-symbols-outlined text-[18px]">settings</span>
          <span className="text-[10px] mt-0.5">Settings</span>
        </Link>
        <button onClick={handleLogout} className="flex flex-col items-center justify-center text-[#615d59] hover:text-[#e32d14] transition-all">
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span className="text-[10px] mt-0.5">Logout</span>
        </button>
      </nav>
    </>
  )
}

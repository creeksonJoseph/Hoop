import { Link, useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle, Settings, LogOut, Plus, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function NavRail({ activePage }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const navItems = [
    { href: '/home', icon: MessageCircle, label: 'Conversations', key: 'home' },
    { href: '/sessions', icon: Plus, label: 'Wingmen', key: 'sessions' },
    { href: '/settings', icon: Settings, label: 'Settings', key: 'settings' },
  ]

  return (
    <>
      {/* Desktop rail */}
      <nav className="w-[56px] h-full hidden md:flex flex-col bg-white border-r border-[#dfdcd9] shrink-0 py-4 items-center justify-between z-20 font-sans">
        <div className="flex flex-col items-center gap-6 w-full">
          <Link to="/home" className="w-8 h-8 rounded-[8px] bg-[#191918] flex items-center justify-center font-bold text-white text-[13px] cursor-pointer hover:bg-[#31302e] transition-colors shrink-0">
            H
          </Link>
          <div className="flex flex-col items-center gap-1.5 w-full px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = activePage === item.key
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  title={item.label}
                  className={`w-9 h-9 rounded-[8px] flex items-center justify-center transition-all duration-150 cursor-pointer group relative
                    ${active
                      ? 'text-[#0075de] bg-[#e6f3fe] border border-[#0075de]/20'
                      : 'text-[#615d59] hover:text-[#191918] hover:bg-[#f6f5f4] border border-transparent'
                    }`}
                >
                  <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#191918] rounded-[4px] text-[11px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-md transition-opacity duration-150">
                    {item.label}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="w-9 h-9 rounded-[8px] flex items-center justify-center text-[#615d59] hover:text-[#e32d14] hover:bg-[#fef3f1] transition-colors cursor-pointer group relative"
        >
          <LogOut size={19} strokeWidth={2} />
          <div className="absolute left-full ml-2 px-2 py-1 bg-[#191918] rounded-[4px] text-[11px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-md transition-opacity duration-150">
            Sign Out
          </div>
        </button>
      </nav>

      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-[#dfdcd9] z-50 flex items-center justify-around px-2 md:hidden font-sans">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = activePage === item.key
          return (
            <Link
              key={item.key}
              to={item.href}
              className={`flex flex-col items-center justify-center transition-all px-3 py-1 rounded-[8px] ${active ? 'text-[#0075de]' : 'text-[#615d59]'}`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          )
        })}
        <button onClick={handleLogout} className="flex flex-col items-center justify-center text-[#615d59] hover:text-[#e32d14] transition-all px-3 py-1">
          <LogOut size={20} strokeWidth={2} />
          <span className="text-[10px] mt-0.5 font-medium">Logout</span>
        </button>
      </nav>
    </>
  )
}

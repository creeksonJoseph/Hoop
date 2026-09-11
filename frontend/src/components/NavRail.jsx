import { Link, useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle, Settings, LogOut, Users, Home, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function NavRail({ activePage }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = [
    { href: '/home', icon: Home, label: 'Overview', key: 'home' },
    { href: '/wingmen', icon: Users, label: 'Wingmen', key: 'sessions' },
    { href: '/settings', icon: Settings, label: 'Settings', key: 'settings' },
  ]
  const current = activePage || (location.pathname.startsWith('/settings') ? 'settings' : location.pathname.startsWith('/wingmen') || location.pathname.startsWith('/sessions') ? 'sessions' : 'home')
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-white px-4 py-5">
        <Link to="/home" className="flex items-center gap-3 px-2 mb-8">
          <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background shadow-sm">H</span>
          <span className="font-semibold tracking-tight">Hoop</span>
        </Link>
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ href, icon: Icon, label, key }) => {
            const active = current === key
            return <Link key={key} to={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />{label}
            </Link>
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-border bg-muted/50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Sparkles size={14} className="text-primary" /> Stay in control</div>
          <p className="text-xs leading-5 text-muted-foreground">Give your team the right access to every conversation.</p>
        </div>
        <button onClick={handleLogout} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LogOut size={18} /> Sign out</button>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border bg-white/95 px-2 backdrop-blur md:hidden">
        {navItems.map(({ href, icon: Icon, label, key }) => {
          const active = current === key
          return <Link key={key} to={href} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}><Icon size={20} strokeWidth={active ? 2.5 : 2} /><span>{label}</span></Link>
        })}
        <button onClick={handleLogout} className="flex min-w-16 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium text-muted-foreground"><LogOut size={20} /><span>Sign out</span></button>
      </nav>
    </>
  )
}

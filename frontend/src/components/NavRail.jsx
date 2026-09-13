import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Settings, LogOut, Users, Home } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function TypewriterText({ text = "When you are out of words, let your wingman handle it.", typingSpeed = 55, deletingSpeed = 35, pauseDuration = 2400 }) {
  const [displayedText, setDisplayedText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let timer

    if (!isDeleting && displayedText.length < text.length) {
      timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1))
      }, typingSpeed)
    } else if (!isDeleting && displayedText.length === text.length) {
      timer = setTimeout(() => {
        setIsDeleting(true)
      }, pauseDuration)
    } else if (isDeleting && displayedText.length > 0) {
      timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length - 1))
      }, deletingSpeed)
    } else if (isDeleting && displayedText.length === 0) {
      timer = setTimeout(() => {
        setIsDeleting(false)
      }, 500)
    }

    return () => clearTimeout(timer)
  }, [displayedText, isDeleting, text, typingSpeed, deletingSpeed, pauseDuration])

  return (
    <span className="inline-flex items-center text-[11px] leading-snug text-[#736f6b] font-medium min-h-[2.4rem]">
      {displayedText}
    </span>
  )

}

export default function NavRail({ activePage }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = [
    { href: '/home', icon: Home, label: 'Home', key: 'home' },
    { href: '/wingmen', icon: Users, label: 'Wingmen', key: 'sessions' },
    { href: '/settings', icon: Settings, label: 'Settings', key: 'settings' },
  ]
  const current = activePage || (location.pathname.startsWith('/settings') ? 'settings' : location.pathname.startsWith('/wingmen') || location.pathname.startsWith('/sessions') ? 'sessions' : 'home')
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      <aside className="hidden md:flex w-[clamp(13rem,22vw,16rem)] shrink-0 flex-col border-r border-border bg-white px-[clamp(.75rem,2vw,1rem)] py-5">
        <div className="px-2 mb-6">
          <Link to="/home" className="flex items-center gap-2.5 mb-1.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#191918] text-xs font-bold text-white shadow-xs">H</span>
            <span className="font-semibold text-base tracking-tight text-[#191918]">Hooop</span>
          </Link>
          <div className="min-h-[2.4rem] flex items-center">
            <TypewriterText text="When you are out of words, let your wingman handle it." />
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map(({ href, icon: Icon, label, key }) => {
            const active = current === key
            return <Link key={key} to={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />{label}
            </Link>
          })}
        </nav>
        <div className="mt-auto"></div>
        <button onClick={handleLogout} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LogOut size={18} /> Sign out</button>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-start justify-around border-t border-border bg-white/95 px-1 pt-1 backdrop-blur md:hidden safe-bottom">
        {navItems.map(({ href, icon: Icon, label, key }) => {
          const active = current === key
          return <Link key={key} to={href} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}><Icon size={20} strokeWidth={active ? 2.5 : 2} /><span>{label}</span></Link>
        })}
        <button onClick={handleLogout} className="flex min-w-16 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium text-muted-foreground"><LogOut size={20} /><span>Sign out</span></button>
      </nav>
    </>
  )
}


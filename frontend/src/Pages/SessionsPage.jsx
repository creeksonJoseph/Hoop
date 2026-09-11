import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Zap, Users, ShieldCheck } from 'lucide-react'
import { useSessions } from '../hooks/useSessions'
import NavRail from '../components/NavRail'
import SessionCard from '../components/sessions/SessionCard'
import { SessionsSkeleton } from '../components/skeletons/Skeletons'

export default function SessionsPage() {
  const { igUsername } = useParams()
  const { sessions, loading, updateSession, deleteSession } = useSessions(igUsername)
  return <div className="min-h-screen flex bg-background text-foreground font-sans">
    <NavRail activePage="sessions" />
    <main className="min-w-0 flex-1 pb-20 md:pb-0">
      <div className="mx-auto max-w-5xl px-5 py-6 md:px-10 md:py-10">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <Link to="/home" className="mt-1 flex size-9 items-center justify-center rounded-xl border bg-card text-muted-foreground hover:bg-muted md:hidden"><ArrowLeft size={17} /></Link>
            <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Access management</p><h1 className="text-3xl font-semibold tracking-tight">Wingmen</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Share focused access to your Instagram conversations. Each wingman can view messages or reply depending on the access you choose.</p></div>
          </div>
          <Link to={`/sessions/${igUsername}/new`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"><Plus size={17} /> Add wingman</Link>
        </header>
        <section className="mb-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-4"><Users size={18} className="mb-5 text-primary" /><p className="text-2xl font-semibold">{sessions.length}</p><p className="text-xs text-muted-foreground">Active wingmen</p></div>
          <div className="rounded-2xl border bg-card p-4"><EyeIcon /><p className="mt-3 text-sm font-semibold">Read-only by default</p><p className="text-xs text-muted-foreground">Safer shared access</p></div>
          <div className="rounded-2xl border bg-card p-4"><ShieldCheck size={18} className="mb-5 text-emerald-600" /><p className="text-sm font-semibold">Revocable anytime</p><p className="text-xs text-muted-foreground">You stay in control</p></div>
        </section>
        <section className="rounded-2xl border bg-card shadow-sm"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Your wingmen</h2><p className="text-xs text-muted-foreground">{igUsername ? `Connected to @${igUsername}` : 'Manage shared conversation access'}</p></div><Zap size={18} className="text-primary" /></div><div className="flex flex-col gap-3 p-4">
          {loading ? <SessionsSkeleton /> : sessions.length === 0 ? <div className="flex flex-col items-center gap-3 px-5 py-16 text-center"><div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary"><Users size={26} /></div><h3 className="font-semibold">No wingmen yet</h3><p className="max-w-sm text-sm text-muted-foreground">Create a secure link when you want someone to help monitor or reply to your DMs.</p><Link to={`/sessions/${igUsername}/new`} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus size={16} /> Add your first wingman</Link></div> : sessions.map((session) => <SessionCard key={session.id} session={session} onUpdate={updateSession} onDelete={deleteSession} />)}
        </div></section>
      </div>
    </main>
  </div>
}
function EyeIcon() { return <div className="mb-5 flex size-[18px] items-center justify-center rounded-full border-2 border-primary text-[9px] text-primary">✓</div> }

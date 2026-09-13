import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check, Trash2, Eye, Send, Ban, Loader2, MessageSquare, ExternalLink, Share2 } from 'lucide-react'
import ConfirmModal from '../common/ConfirmModal'
import { useToast } from '../../context/ToastContext'

export default function SessionCard({ session, onUpdate, onDelete }) {
  const [copied, setCopied] = useState(false)
  const [loadingAction, setLoadingAction] = useState(null)
  const [confirmModalState, setConfirmModalState] = useState(null)
  const { toast } = useToast()

  const levelConfig = {
    read: { label: 'Read Only', icon: Eye, color: 'text-[#0075de] bg-[#e6f3fe] border-[#0075de]/20' },
    send: { label: 'Read & Write', icon: Send, color: 'text-[#0f6220] bg-[#f0faf2] border-[#abe5b8]' },
    revoked: { label: 'Revoked', icon: Ban, color: 'text-[#b01601] bg-[#fef3f1] border-[#fdd3cd]' },
  }

  const level = levelConfig[session.access_level] || levelConfig.revoked
  const LevelIcon = level.icon
  const wingmanName = session.wingman_name || 'this wingman'
  const nextLevel = session.access_level === 'read' ? 'send' : 'read'
  const nextLevelLabel = nextLevel === 'send' ? 'Read & Write' : 'Read Only'
  const shareUrl = `${window.location.origin}/wingman/${session.token}`

  const promptToggleAccess = () => {
    setConfirmModalState({
      action: 'toggle',
      title: 'Change Access Level?',
      description: `Are you sure you want to change ${wingmanName}'s access for @${session.ig_username} to ${nextLevelLabel}?`,
      confirmText: `Switch to ${nextLevelLabel}`,
      isDestructive: false,
    })
  }

  const promptRevoke = () => {
    setConfirmModalState({
      action: 'revoke',
      title: 'Revoke Wingman Access?',
      description: `Are you sure you want to revoke ${wingmanName}'s access link for @${session.ig_username}? They will no longer be able to view or send messages.`,
      confirmText: 'Revoke Link',
      isDestructive: true,
    })
  }

  const promptDelete = () => {
    setConfirmModalState({
      action: 'delete',
      title: 'Delete Wingman Link?',
      description: `Are you sure you want to permanently delete this link for ${wingmanName} (@${session.ig_username})?`,
      confirmText: 'Delete Link',
      isDestructive: true,
    })
  }

  const handleConfirmModalAction = async () => {
    if (!confirmModalState) return
    const { action } = confirmModalState

    if (action === 'toggle') {
      setLoadingAction(nextLevel)
      try {
        await onUpdate(session.id, nextLevel)
        setConfirmModalState(null)
      } finally {
        setLoadingAction(null)
      }
    } else if (action === 'revoke') {
      setLoadingAction('revoked')
      try {
        await onUpdate(session.id, 'revoked')
        setConfirmModalState(null)
      } finally {
        setLoadingAction(null)
      }
    } else if (action === 'delete') {
      setLoadingAction('delete')
      try {
        await onDelete(session.id)
        setConfirmModalState(null)
      } finally {
        setLoadingAction(null)
      }
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast('Link copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMobileShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hooop Wingman Link (@${session.ig_username})`,
          text: `Wingman access link for @${session.ig_username}:`,
          url: shareUrl
        })
      } catch {
        copyLink()
      }
    } else {
      copyLink()
    }
  }

  return (
    <div className="bg-[#f9f9f8] border border-[#dfdcd9] rounded-[10px] p-3.5 space-y-3 font-sans transition-all hover:border-[#b4bcd0]">
      {/* DM Header & View DM Action */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-[6px] bg-[#e6f3fe] border border-[#0075de]/20 flex items-center justify-center shrink-0 text-[#0075de]">
            <MessageSquare size={14} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#191918] truncate">@{session.ig_username}</p>
            <p className="text-[10px] text-[#615d59] font-mono">{session.token_preview}…</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-[4px] border flex items-center gap-1 ${level.color}`}>
            <LevelIcon size={11} strokeWidth={2} />
            {level.label}
          </span>

          {/* View DM Button: takes user back to that DM on Home page */}
          <Link
            to={`/chat/${session.ig_username}`}
            className="inline-flex items-center gap-1 text-[11px] font-medium bg-white hover:bg-[#e6f3fe] border border-[#dfdcd9] hover:border-[#0075de]/30 text-[#0075de] px-2.5 py-1 rounded-[6px] transition-colors shadow-xs"
          >
            <span>View DM</span>
            <ExternalLink size={11} strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {session.access_level !== 'revoked' && (
          <>
            <button
              onClick={promptToggleAccess}
              disabled={loadingAction !== null}
              className="flex-1 min-w-[8.5rem] text-[11px] font-medium bg-white border border-[#dfdcd9] hover:bg-[#f6f5f4] text-[#494744] py-1 px-2.5 rounded-[6px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {loadingAction === 'read' || loadingAction === 'send' ? (
                <><Loader2 size={12} className="animate-spin text-[#0075de]" /> Updating…</>
              ) : session.access_level === 'read' ? (
                <><Send size={11} strokeWidth={2} /> Switch to Read & Write</>
              ) : (
                <><Eye size={11} strokeWidth={2} /> Switch to Read Only</>
              )}
            </button>
            <button
              onClick={promptRevoke}
              disabled={loadingAction !== null}
              className="flex-1 min-w-[6.5rem] text-[11px] font-medium bg-[#fef3f1] border border-[#fdd3cd] text-[#e32d14] hover:bg-[#e32d14] hover:text-white py-1 px-2.5 rounded-[6px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {loadingAction === 'revoked' ? (
                <><Loader2 size={12} className="animate-spin text-[#e32d14]" /> Revoking…</>
              ) : (
                <><Ban size={11} strokeWidth={2} /> Revoke Link</>
              )}
            </button>
          </>
        )}
        <button
          onClick={promptDelete}
          disabled={loadingAction !== null}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#615d59] hover:text-[#e32d14] hover:bg-[#fef3f1] border border-[#dfdcd9] transition-colors shrink-0 disabled:opacity-60 cursor-pointer"
          title="Delete Link"
        >
          {loadingAction === 'delete' ? (
            <Loader2 size={13} className="animate-spin text-[#e32d14]" />
          ) : (
            <Trash2 size={13} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Copy & Share link bar */}
      <div className="flex min-w-0 items-center gap-1.5 pt-1.5 border-t border-[#dfdcd9]">
        <input
          aria-label="Wingman access link"
          readOnly
          value={shareUrl}
          className="flex-1 bg-white border border-[#dfdcd9] rounded-[4px] px-2 py-1 text-[10px] text-[#494744] font-mono focus:outline-none"
        />

        {/* View Wingman link in new tab */}
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="View Wingman Link"
          className="w-6 h-6 flex items-center justify-center rounded-[4px] bg-white border border-[#dfdcd9] text-[#615d59] hover:text-[#0075de] hover:bg-[#e6f3fe] transition-colors shrink-0 cursor-pointer"
        >
          <ExternalLink size={13} strokeWidth={2} />
        </a>

        {/* Desktop Copy Button (tick indicator on success) */}
        <button
          onClick={copyLink}
          className={`hidden sm:flex w-6 h-6 items-center justify-center rounded-[4px] border transition-colors shrink-0 cursor-pointer ${
            copied
              ? 'bg-[#e6f9ed] border-[#abe5b8] text-[#12b76a]'
              : 'bg-white border-[#dfdcd9] text-[#615d59] hover:text-[#0075de] hover:bg-[#e6f3fe]'
          }`}
          title={copied ? 'Copied!' : 'Copy Link'}
        >
          {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
        </button>

        {/* Mobile Share Button (triggers native mobile share drawer) */}
        <button
          onClick={handleMobileShare}
          className="flex sm:hidden w-6 h-6 items-center justify-center rounded-[4px] bg-white border border-[#dfdcd9] text-[#0075de] hover:bg-[#e6f3fe] transition-colors shrink-0 cursor-pointer"
          title="Share Link"
        >
          <Share2 size={13} strokeWidth={2} />
        </button>
      </div>

      <ConfirmModal
        isOpen={Boolean(confirmModalState)}
        title={confirmModalState?.title || ''}
        description={confirmModalState?.description || ''}
        confirmText={confirmModalState?.confirmText || 'Confirm'}
        isDestructive={confirmModalState?.isDestructive || false}
        loading={loadingAction !== null}
        onConfirm={handleConfirmModalAction}
        onClose={() => setConfirmModalState(null)}
      />
    </div>
  )
}

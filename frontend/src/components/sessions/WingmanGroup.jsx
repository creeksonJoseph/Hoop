import { useState } from 'react'
import { ChevronDown, MessageSquare, Eye, Send, Ban, Copy, Check, Share2, MoreVertical, Loader2, Trash2, RotateCcw } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import ConfirmModal from '../common/ConfirmModal'

function CompactSessionItem({ session, onUpdate, onDelete }) {
  const [copied, setCopied] = useState(false)
  const [loadingAction, setLoadingAction] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)
  const { toast } = useToast()

  const shareUrl = `${window.location.origin}/wingman/${session.token}`
  const igHandle = session.ig_username ? `@${session.ig_username}` : 'this DM'

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
          title: `Hooop Wingman Link (${igHandle})`,
          text: `Wingman access link for ${igHandle}:`,
          url: shareUrl,
        })
      } catch {
        copyLink()
      }
    } else {
      copyLink()
    }
  }

  const promptToggleAccess = (targetLevel) => {
    setMenuOpen(false)
    const levelLabel = targetLevel === 'send' ? 'Read & reply' : 'Read only'
    setConfirmModal({
      action: 'update',
      targetLevel,
      title: 'Change Access Level?',
      description: `Are you sure you want to change access level for ${igHandle} to ${levelLabel}?`,
      confirmText: `Switch to ${levelLabel}`,
      isDestructive: false,
    })
  }

  const promptRevoke = () => {
    setMenuOpen(false)
    setConfirmModal({
      action: 'update',
      targetLevel: 'revoked',
      title: 'Revoke Access Link?',
      description: `Are you sure you want to revoke access for ${igHandle}? They will no longer be able to view or reply to messages.`,
      confirmText: 'Revoke Link',
      isDestructive: true,
    })
  }

  const promptRestore = (targetLevel) => {
    setMenuOpen(false)
    const levelLabel = targetLevel === 'send' ? 'Read & reply' : 'Read only'
    setConfirmModal({
      action: 'update',
      targetLevel,
      title: 'Re-assign Wingman Access?',
      description: `Are you sure you want to re-activate access for ${igHandle} with ${levelLabel} permission?`,
      confirmText: `Re-activate (${levelLabel})`,
      isDestructive: false,
    })
  }

  const promptDelete = () => {
    setMenuOpen(false)
    setConfirmModal({
      action: 'delete',
      title: 'Remove session?',
      description: `This will remove ${igHandle}'s access from this conversation. The wingman will no longer be able to view or reply to this DM.`,
      confirmText: 'Remove session',
      isDestructive: true,
    })
  }

  const handleConfirmModalAction = async () => {
    if (!confirmModal) return
    const { action, targetLevel } = confirmModal
    setLoadingAction(action)
    try {
      if (action === 'update') {
        await onUpdate(session.id, targetLevel)
        if (targetLevel === 'revoked') {
          toast('Wingman link revoked', 'success')
        } else {
          toast(`Access level changed to ${targetLevel === 'send' ? 'Read & reply' : 'Read only'}`, 'success')
        }
      } else if (action === 'delete') {
        await onDelete(session.id)
        toast('Wingman deleted', 'success')
      }
    } finally {
      setLoadingAction(null)
      setConfirmModal(null)
    }
  }

  return (
    <>
      <div className={`relative flex items-center justify-between gap-3 py-2 px-1 border-b border-[#dfdcd9]/60 last:border-none text-xs ${menuOpen ? 'z-30' : 'z-1'}`}>
        {/* Left: DM Handle */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-[6px] bg-[#e6f3fe] text-[#0075de] flex items-center justify-center shrink-0">
            <MessageSquare size={13} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[#191918] truncate">{igHandle}</p>
          </div>
        </div>

        {/* Middle: Access Level Badge & Link preview */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end sm:justify-center">
          {session.access_level === 'read' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-[4px] text-[#615d59] bg-[#f9f9f8] border border-[#dfdcd9] shrink-0">
              <Eye size={11} /> Read only
            </span>
          )}
          {session.access_level === 'send' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-[4px] text-[#615d59] bg-[#f9f9f8] border border-[#dfdcd9] shrink-0">
              <Send size={11} /> Read & reply
            </span>
          )}
          {session.access_level === 'revoked' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-[4px] text-[#b01601] bg-[#fef3f1] border border-[#fdd3cd] shrink-0">
              <Ban size={11} /> Revoked
            </span>
          )}

          {/* Desktop Link & Copy */}
          <div className="hidden md:flex items-center gap-1 bg-[#f9f9f8] border border-[#dfdcd9] rounded-[6px] px-2 py-0.5 text-[11px] text-[#615d59] font-mono min-w-0 max-w-[180px]">
            <span className="truncate flex-1">{session.token_preview ? `...${session.token_preview}` : shareUrl}</span>
            <button
              type="button"
              onClick={copyLink}
              className="text-[#615d59] hover:text-[#0075de] transition-colors p-0.5 shrink-0 cursor-pointer"
              title="Copy link"
            >
              {copied ? <Check size={12} className="text-[#0f6220]" /> : <Copy size={12} />}
            </button>
          </div>

          {/* Mobile Share Button */}
          <button
            type="button"
            onClick={handleMobileShare}
            className="md:hidden text-[#615d59] hover:text-[#0075de] p-1 border border-[#dfdcd9] rounded-[6px] bg-[#f9f9f8] transition-colors cursor-pointer shrink-0"
            title="Share link"
          >
            {copied ? <Check size={12} className="text-[#0f6220]" /> : <Share2 size={12} />}
          </button>
        </div>

        {/* Right: Actions Menu */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            disabled={loadingAction !== null}
            className="p-1 rounded-[6px] text-[#615d59] hover:text-[#191918] hover:bg-[#f6f5f4] transition-colors cursor-pointer"
            title="Actions"
          >
            {loadingAction ? <Loader2 size={15} className="animate-spin text-[#0075de]" /> : <MoreVertical size={15} />}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white border border-[#dfdcd9] rounded-[8px] shadow-md py-1 text-xs font-medium text-[#191918]">
                {session.access_level !== 'revoked' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => promptToggleAccess(session.access_level === 'read' ? 'send' : 'read')}
                      className="w-full px-3 py-1.5 text-left hover:bg-[#e6f3fe] text-[#0075de] flex items-center gap-2 cursor-pointer"
                    >
                      {session.access_level === 'read' ? (
                        <><Send size={13} /> Switch to Read & reply</>
                      ) : (
                        <><Eye size={13} /> Switch to Read only</>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={promptRevoke}
                      className="w-full px-3 py-1.5 text-left hover:bg-[#fef3f1] text-[#b01601] flex items-center gap-2 cursor-pointer"
                    >
                      <Ban size={13} /> Revoke link
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => promptRestore('read')}
                      className="w-full px-3 py-1.5 text-left hover:bg-[#e6f3fe] text-[#0075de] flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw size={13} /> Re-activate (Read only)
                    </button>
                    <button
                      type="button"
                      onClick={() => promptRestore('send')}
                      className="w-full px-3 py-1.5 text-left hover:bg-[#e6f3fe] text-[#0075de] flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw size={13} /> Re-activate (Read & reply)
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={promptDelete}
                  className="w-full px-3 py-1.5 text-left hover:bg-[#fef3f1] text-[#b01601] flex items-center gap-2 cursor-pointer border-t border-[#dfdcd9]/60"
                >
                  <Trash2 size={13} /> Remove session
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(confirmModal)}
        title={confirmModal?.title}
        description={confirmModal?.description}
        confirmText={confirmModal?.confirmText}
        isDestructive={confirmModal?.isDestructive}
        loading={loadingAction !== null}
        onConfirm={handleConfirmModalAction}
        onClose={() => setConfirmModal(null)}
      />
    </>
  )
}

export default function WingmanGroup({ wingmanName, sessions, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative bg-white border border-[#dfdcd9] rounded-[8px] shadow-xs transition-all">
      {/* Compact Wingman Header Row */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 rounded-full bg-[#191918] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
            {(wingmanName || '').replace(/^@+/, '').trim()[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-xs text-[#191918] truncate">{wingmanName}</h2>
            <p className="text-[11px] text-[#615d59]">
              {sessions.length} shared DM{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Toggle Details Button */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1 text-[11px] font-medium text-[#191918] bg-[#f6f5f4] hover:bg-[#e6e4e1] border border-[#dfdcd9] px-2 py-0.5 rounded-[6px] transition-colors cursor-pointer shrink-0 h-fit"
        >
          <span>{expanded ? 'Hide details' : 'Show details'}</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Expanded DM Details */}
      {expanded && (
        <div className="border-t border-[#dfdcd9] px-4 py-2 bg-white space-y-1">
          {sessions.map((session) => (
            <CompactSessionItem
              key={session.id}
              session={session}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

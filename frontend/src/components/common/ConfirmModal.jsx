import { Loader2, AlertTriangle, AlertCircle } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-xs font-sans fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#dfdcd9] rounded-[12px] p-[clamp(1.25rem,4vw,1.5rem)] w-[calc(100%-2rem)] max-w-sm shadow-xl scale-in space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${
              isDestructive
                ? 'bg-[#fef3f1] text-[#e32d14] border-[#fdd3cd]'
                : 'bg-[#e6f3fe] text-[#0075de] border-[#0075de]/20'
            }`}
          >
            {isDestructive ? <AlertTriangle size={18} strokeWidth={2} /> : <AlertCircle size={18} strokeWidth={2} />}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-[#191918] tracking-tight">{title}</h3>
            <p className="text-[12.5px] text-[#615d59] leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-2 border-t border-[#dfdcd9]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-[#f6f5f4] text-[#494744] hover:bg-[#dfdcd9] border border-[#dfdcd9] py-2 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 font-medium py-2 rounded-[8px] text-[12px] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              isDestructive
                ? 'bg-[#e32d14] text-white hover:bg-[#c9250e]'
                : 'bg-[#0075de] text-white hover:bg-[#005bab]'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Processing…
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

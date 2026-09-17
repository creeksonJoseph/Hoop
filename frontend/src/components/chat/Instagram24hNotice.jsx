import { useState } from 'react'
import { Info, Clock, ChevronDown, ChevronUp } from 'lucide-react'

export default function Instagram24hNotice({ warningText, isExpired, isExpiringSoon }) {
  const [showPolicyInfo, setShowPolicyInfo] = useState(false)

  if (!warningText && !isExpired && !isExpiringSoon) return null

  const isWarning = isExpired
  const bgClass = isWarning ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]' : 'bg-[#f0f9ff] border-[#bae6fd] text-[#0369a1]'
  const iconColor = isWarning ? 'text-[#d97706]' : 'text-[#0284c7]'

  return (
    <div className={`mx-[clamp(.75rem,3vw,1rem)] mb-2 p-3 rounded-[10px] border ${bgClass} text-xs transition-all shadow-xs`}>
      <div className="flex items-start gap-2.5">
        {isWarning ? (
          <Clock size={16} className={`${iconColor} shrink-0 mt-0.5`} strokeWidth={2} />
        ) : (
          <Info size={16} className={`${iconColor} shrink-0 mt-0.5`} strokeWidth={2} />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-relaxed">{warningText}</p>

          <button
            type="button"
            onClick={() => setShowPolicyInfo((prev) => !prev)}
            className="mt-1.5 inline-flex items-center gap-1 font-semibold text-[11px] underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            {showPolicyInfo ? (
              <>
                Hide details <ChevronUp size={12} />
              </>
            ) : (
              <>
                Why does Instagram have this rule? <ChevronDown size={12} />
              </>
            )}
          </button>

          {showPolicyInfo && (
            <div className="mt-2 pt-2 border-t border-current/15 text-[11px] leading-relaxed opacity-95 space-y-1">
              <p>
                Meta (Instagram) enforces a 24-hour messaging window policy to prevent spam. You can send direct messages to someone within 24 hours of their last interaction with your account.
              </p>
              <p className="font-medium">
                How to reopen the window:
              </p>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                <li>They send a direct message to your Instagram account</li>
                <li>They comment on any of your Instagram posts</li>
                <li>They reply to or mention your Instagram story</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

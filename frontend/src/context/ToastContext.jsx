import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs font-medium shadow-md fade-up ${
              t.type === 'error'
                ? 'bg-[#fef3f1] border-[#fdd3cd] text-[#b01601]'
                : t.type === 'success'
                ? 'bg-[#f0faf2] border-[#abe5b8] text-[#0f6220]'
                : 'bg-white border-[#dfdcd9] text-[#191918]'
            }`}
          >
            {t.type === 'error' ? (
              <AlertCircle size={16} className="text-[#b01601] shrink-0" />
            ) : t.type === 'success' ? (
              <CheckCircle2 size={16} className="text-[#0f6220] shrink-0" />
            ) : (
              <Info size={16} className="text-[#0075de] shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

import { useEffect } from 'react'

export default function SentryTestPage() {
  useEffect(() => {
    throw new Error('Sentry frontend test error - hooop wiring verified')
  }, [])

  return null
}
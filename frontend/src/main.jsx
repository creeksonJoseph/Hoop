import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import App from './App'
import './index.css'
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: 'https://71a0ecd5ad78cbe8126d4ba15f20db2d@o4512254075535360.ingest.de.sentry.io/4512254154113104',
  environment: import.meta.env.DEV ? 'development' : 'production',
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: false,
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA ServiceWorker registration failed:', err)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div>An unexpected error occurred.</div>}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>
)

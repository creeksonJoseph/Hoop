import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// Serve the pre-rendered head for /privacy in dev, matching the Vercel rewrite.
const privacyRouteInDev = {
  name: 'serve-privacy-html',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/privacy' || req.url?.startsWith('/privacy?')) {
        req.url = req.url.replace('/privacy', '/privacy.html')
      }
      next()
    })
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    privacyRouteInDev,
    sentryVitePlugin({
      org: 'joseph-charana',
      project: 'hooop',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        privacy: resolve(rootDir, 'privacy.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api.hooop.tech',
        changeOrigin: true,
      },
      '/ws': {
        target: 'wss://api.hooop.tech',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})

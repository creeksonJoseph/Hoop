import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sentryVitePlugin({
      org: 'joseph-charana',
      project: 'hooop',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  build: {
    sourcemap: true,
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

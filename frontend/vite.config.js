import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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

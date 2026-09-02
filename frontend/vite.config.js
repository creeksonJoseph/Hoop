import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://hoop-4thy.onrender.com',
        changeOrigin: true,
      },
      '/ws': {
        target: 'wss://hoop-4thy.onrender.com',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // In development, forward API calls to the local Express server (Vercel does this in production via vercel.json).
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})

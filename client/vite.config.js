import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In development, any request my React code makes to /api/... is forwarded
      // by Vite to my Express server on port 3000. To the browser it all looks
      // like the same origin (localhost:5173), so there's no CORS to deal with.
      '/api': 'http://localhost:3000',
    },
  },
})

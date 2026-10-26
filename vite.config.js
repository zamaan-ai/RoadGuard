import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
const BACKEND = 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': BACKEND,
      '/uploads': BACKEND,
      '/socket.io': { target: BACKEND, ws: true },
    },
  },
})

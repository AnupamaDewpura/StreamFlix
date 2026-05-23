import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // This makes the frontend talk to the backend automatically
    proxy: {
      '/api': 'http://localhost:3001',
      '/proxy': 'http://localhost:3001',
    }
  }
})

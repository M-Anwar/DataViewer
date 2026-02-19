import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/ping': 'http://localhost:8000',
      '/facets': 'http://localhost:8000',
      '/search': 'http://localhost:8000',
      '/select': 'http://localhost:8000',
    },
  },
})

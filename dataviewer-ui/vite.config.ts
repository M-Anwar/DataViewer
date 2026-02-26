import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

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
      '/get_row_visualization': 'http://localhost:8000',
    },
  },
})

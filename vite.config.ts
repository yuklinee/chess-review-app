import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages project path. The Stockfish worker and WASM paths are built
  // from import.meta.env.BASE_URL, so this stays the single source of truth.
  base: '/chess-review-app/',
})

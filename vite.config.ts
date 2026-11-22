import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative paths allow the app to work on GitHub Pages project URLs.
  base: './',
})

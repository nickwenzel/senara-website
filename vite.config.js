import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from the root of senaramed.com, so base is "/".
// VITE_BASE only matters if the site is ever served from a sub-path.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
  build: {
    chunkSizeWarningLimit: 1200, // three.js is one large chunk by design
  },
})

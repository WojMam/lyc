/**
 * Shim for shadcn/ui CLI which looks for vite.config.ts.
 * Actual Electron builds use electron.vite.config.ts.
 */
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve('src/renderer'),
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared'),
      '@': resolve('src/renderer/src')
    }
  },
  plugins: [react()]
})

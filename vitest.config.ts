import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared'),
      '@': resolve('src/renderer/src'),
      '@main': resolve('src/main')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.ts', 'tests/integration/**/*.{test,spec}.ts'],
    environmentMatchGlobs: [['tests/unit/**/*.tsx', 'jsdom']],
    setupFiles: ['tests/setup.ts']
  }
})

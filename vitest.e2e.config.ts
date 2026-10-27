import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@main': resolve('src/main')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.{test,spec}.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000
  }
})

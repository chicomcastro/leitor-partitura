import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['node_modules/**', 'e2e/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      all: true,
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/test/**',
        '**/*.test.{js,jsx}',
        '**/*.module.css',
      ],
      // Guard against regressions. Set below current levels with margin so the
      // build fails if coverage drops meaningfully; raise as coverage grows.
      thresholds: {
        lines: 28,
        statements: 28,
        functions: 35,
        branches: 60,
      },
    },
  },
})

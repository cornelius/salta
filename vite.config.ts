import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// GitHub Pages serves the project site from /salta/, so asset URLs must be
// prefixed in a production build. A dev server runs at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/salta/' : '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        rules: resolve(import.meta.dirname, 'rules/index.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
}))

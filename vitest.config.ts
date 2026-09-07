import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  // Arbor's development-only diagnostics are intentionally part of its
  // behavioral test suite. Production builds replace this with false.
  define: { __DEV__: 'true' },
  resolve: {
    alias: {
      '@aihu/signals/lifecycle': source('./packages/signals/src/lifecycle.ts'),
      '@aihu/reactive/helpers': source('./packages/reactive/src/helpers/index.ts'),
      '@aihu/arbor/hydrate': source('./packages/arbor/src/hydrate.ts'),
      '@aihu/arbor/progressive': source('./packages/arbor/src/progressive.ts'),
      '@aihu/signals': source('./packages/signals/src/index.ts'),
      '@aihu/reactive': source('./packages/reactive/src/index.ts'),
      '@aihu/arbor': source('./packages/arbor/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['packages/*/tests/**/*.test.ts'],
  },
})

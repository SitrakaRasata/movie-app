import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    // Server modules validate their environment at import time. Tests talk to
    // pglite, never to a real server, so these only need to be well-formed.
    env: {
      DATABASE_URL: 'postgres://test:test@localhost/test',
      TMDB_READ_TOKEN: 'test-token',
    },
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
})

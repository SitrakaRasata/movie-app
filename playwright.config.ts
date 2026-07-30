import { defineConfig, devices } from '@playwright/test'

// Same reason as the Drizzle config: this runs outside Next.js, which is what
// would otherwise load `.env.local`. A real environment variable still wins.
if (!process.env.DATABASE_URL) process.loadEnvFile('.env.local')

export default defineConfig({
  testDir: './tests/e2e',
  // The suite asserts on rows the previous test wrote, so it must stay ordered.
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:3000', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})

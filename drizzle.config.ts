import { defineConfig } from 'drizzle-kit'

// The CLI runs outside Next.js, which is what would otherwise read `.env.local`.
// A real environment variable still wins, so deployments are unaffected.
if (!process.env.DATABASE_URL) process.loadEnvFile('.env.local')

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
})

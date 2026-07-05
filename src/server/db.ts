import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { env } from './env'
import { events, movies, trending } from './schema'

export * from './schema'

/** The raw Neon client, kept alongside Drizzle so that hand-written statements can
 *  be sent with positional parameters — exactly as the tests send them to pglite. */
export const sqlClient = neon(env.DATABASE_URL)

export const db = drizzle(sqlClient, {
  schema: { movies, events, trending },
})

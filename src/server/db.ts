import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env } from './env'
import { events, movies, trending } from './schema'

export * from './schema'

/** The raw pool, kept alongside Drizzle so that hand-written statements can be
 *  sent with positional parameters — exactly as the tests send them to pglite. */
export const sqlClient = new Pool({ connectionString: env.DATABASE_URL })

export const db = drizzle(sqlClient, {
  schema: { movies, events, trending },
})

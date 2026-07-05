import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../drizzle')

/**
 * A real Postgres instance compiled to WebAssembly, running in-process.
 * No Docker, no network, no CI secret — and `ln`, `exp` and `greatest`
 * behave exactly as they do on Neon, which is the entire point.
 */
export async function newTestDb() {
  const pg = new PGlite()
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const file of files) {
    const ddl = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    for (const statement of ddl.split('--> statement-breakpoint')) {
      if (statement.trim()) await pg.exec(statement)
    }
  }
  return {
    sql: (q: string, params: unknown[] = []) => pg.query<Record<string, unknown>>(q, params),
    close: () => pg.close(),
  }
}

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newTestDb } from '../helpers/pg'

let db: Awaited<ReturnType<typeof newTestDb>>

beforeAll(async () => {
  db = await newTestDb()
})
afterAll(async () => db.close())

describe('schema', () => {
  it('creates the three tables', async () => {
    const { rows } = await db.sql(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    )
    expect(rows.map((r) => r.table_name)).toEqual(['events', 'movies', 'trending'])
  })

  it('rejects a duplicate event in the same bucket', async () => {
    await db.sql(`INSERT INTO movies (id, title) VALUES (1, 'Dune')`)
    const insert = `INSERT INTO events (movie_id, visitor_id, kind, occurred_at, bucket)
                    VALUES (1, 'v1', 'view', now(), 42)`
    await db.sql(insert)
    await expect(db.sql(insert)).rejects.toThrow()
  })

  it('cascades event deletion when a movie is removed', async () => {
    await db.sql(`INSERT INTO movies (id, title) VALUES (2, 'Arrival')`)
    await db.sql(`INSERT INTO events (movie_id, visitor_id, kind, occurred_at, bucket)
                  VALUES (2, 'v1', 'view', now(), 1)`)
    await db.sql(`DELETE FROM movies WHERE id = 2`)
    const { rows } = await db.sql(`SELECT count(*)::int AS n FROM events WHERE movie_id = 2`)
    expect(rows[0].n).toBe(0)
  })
})

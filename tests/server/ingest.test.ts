import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_ACC, ingest } from '@/domain/trending/decay'
import { EPOCH0_SECONDS, HALF_LIVES_SECONDS } from '@/domain/trending/weights'
import { INGEST_SQL } from '@/server/trending'
import { newTestDb } from '../helpers/pg'

let db: Awaited<ReturnType<typeof newTestDb>>
const T = EPOCH0_SECONDS + 500_000

beforeAll(async () => {
  db = await newTestDb()
})
afterAll(async () => db.close())

beforeEach(async () => {
  await db.sql(`TRUNCATE trending, events, movies RESTART IDENTITY CASCADE`)
  await db.sql(`INSERT INTO movies (id, title) VALUES (1, 'Dune'), (2, 'Arrival')`)
})

const record = (
  visitor: string,
  ids: number[],
  kind: string,
  at: number,
  weight: number,
  bucket: number,
) =>
  db.sql(INGEST_SQL, [
    ids,
    visitor,
    kind,
    new Date(at * 1000).toISOString(),
    bucket,
    weight,
    at - EPOCH0_SECONDS,
  ])

describe('ingestion', () => {
  it('creates one accumulator row per half-life', async () => {
    await record('v1', [1], 'view', T, 5, 1)
    const { rows } = await db.sql(
      `SELECT half_life FROM trending WHERE movie_id = 1 ORDER BY half_life`,
    )
    expect(rows.map((r) => r.half_life)).toEqual([...HALF_LIVES_SECONDS])
  })

  it('matches the TypeScript implementation exactly', async () => {
    await record('v1', [1], 'view', T, 5, 1)
    await record('v2', [1], 'view', T + 900, 5, 1)
    const { rows } = await db.sql(
      `SELECT log_acc FROM trending WHERE movie_id = 1 AND half_life = 86400`,
    )
    const expected = ingest(ingest(EMPTY_ACC, 5, T, 86_400), 5, T + 900, 86_400)
    expect(rows[0].log_acc).toBeCloseTo(expected, 9)
  })

  it('counts a repeated event in the same bucket only once', async () => {
    await record('v1', [1], 'view', T, 5, 1)
    const { rows: after1 } = await db.sql(
      `SELECT log_acc FROM trending WHERE movie_id = 1 AND half_life = 86400`,
    )
    await record('v1', [1], 'view', T + 10, 5, 1)
    const { rows: after2 } = await db.sql(
      `SELECT log_acc FROM trending WHERE movie_id = 1 AND half_life = 86400`,
    )
    expect(after2[0].log_acc).toBe(after1[0].log_acc)

    const { rows: count } = await db.sql(`SELECT count(*)::int AS n FROM events`)
    expect(count[0].n).toBe(1)
  })

  it('ingests a batch of movie ids in one statement', async () => {
    await record('v1', [1, 2], 'impression', T, 1, 7)
    const { rows } = await db.sql(`SELECT count(*)::int AS n FROM events`)
    expect(rows[0].n).toBe(2)
  })
})

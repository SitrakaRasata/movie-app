import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { EPOCH0_SECONDS } from '@/domain/trending/weights'
import { INGEST_SQL, REBUILD_SQL } from '@/server/trending'
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

describe('ranking', () => {
  it('ranks a recent event above an older one of equal weight', async () => {
    await record('v1', [1], 'view', T, 5, 1)
    await record('v2', [2], 'view', T - 3 * 86_400, 5, 2)
    const { rows } = await db.sql(
      `SELECT movie_id FROM trending WHERE half_life = 86400 ORDER BY log_acc DESC`,
    )
    expect(rows.map((r) => r.movie_id)).toEqual([1, 2])
  })

  it('rebuilds identical accumulators from the event journal alone', async () => {
    await record('v1', [1], 'view', T, 5, 1)
    await record('v2', [1], 'view', T + 900, 5, 1)
    await record('v3', [2], 'impression', T + 100, 1, 3)

    const { rows: incremental } = await db.sql(
      `SELECT movie_id, half_life, log_acc FROM trending ORDER BY movie_id, half_life`,
    )

    await db.sql(`TRUNCATE trending`)
    await db.sql(REBUILD_SQL)

    const { rows: rebuilt } = await db.sql(
      `SELECT movie_id, half_life, log_acc FROM trending ORDER BY movie_id, half_life`,
    )

    expect(rebuilt.length).toBe(incremental.length)
    rebuilt.forEach((row, i) => {
      expect(row.movie_id).toBe(incremental[i].movie_id)
      expect(row.half_life).toBe(incremental[i].half_life)
      expect(row.log_acc).toBeCloseTo(incremental[i].log_acc as number, 9)
    })
  })
})

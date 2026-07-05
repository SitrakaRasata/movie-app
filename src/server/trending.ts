import {
  EPOCH0_SECONDS,
  HALF_LIVES_SECONDS,
  WEIGHT,
  bucketOf,
  type EventKind,
} from '@/domain/trending/weights'
import { sqlClient } from './db'

/** Built from the domain constant rather than written out, so adding a half-life
 *  cannot leave the SQL and the TypeScript disagreeing. */
const HALF_LIFE_VALUES = HALF_LIVES_SECONDS.map((h) => `(${h})`).join(', ')

/**
 * One atomic statement doing three things:
 *
 *  1. `ins`  inserts the events, silently dropping any that fall inside a cooldown
 *            window already used by this visitor. It returns only the rows that
 *            were actually written — so the cooldown gate is a database
 *            constraint, not application logic, and cannot race.
 *  2. `hl`   fans each surviving event out across every half-life.
 *  3. The upsert folds the event into the log-accumulator with log-sum-exp:
 *            logAcc' = max(a, b) + ln(1 + exp(-|a - b|))
 *
 * Parameters: $1 movie ids, $2 visitor, $3 kind, $4 timestamp,
 *             $5 bucket, $6 weight, $7 seconds since EPOCH0.
 */
export const INGEST_SQL = `
WITH ins AS (
  INSERT INTO events (movie_id, visitor_id, kind, occurred_at, bucket)
  SELECT m, $2, $3, $4::timestamptz, $5::bigint FROM unnest($1::int[]) AS m
  ON CONFLICT DO NOTHING
  RETURNING movie_id
),
hl AS (
  SELECT * FROM (VALUES ${HALF_LIFE_VALUES}) AS v(half_life)
)
INSERT INTO trending (movie_id, half_life, log_acc, updated_at)
SELECT ins.movie_id,
       hl.half_life,
       ln($6::double precision) + (ln(2) / hl.half_life) * $7::double precision,
       now()
FROM ins CROSS JOIN hl
ON CONFLICT (movie_id, half_life) DO UPDATE
SET log_acc = GREATEST(trending.log_acc, EXCLUDED.log_acc)
              + ln(1 + exp(-abs(trending.log_acc - EXCLUDED.log_acc))),
    updated_at = now()
`

/**
 * Sends `INGEST_SQL` with positional parameters — the identical text and the
 * identical argument order the pglite tests use. Nothing is interpolated into
 * the statement, so the tested query and the production query cannot drift, and
 * no value ever reaches the parser as literal text.
 */
export async function recordEvents(
  visitorId: string,
  movieIds: number[],
  kind: EventKind,
  atSeconds: number,
): Promise<void> {
  if (movieIds.length === 0) return
  await sqlClient.query(INGEST_SQL, [
    movieIds,
    visitorId,
    kind,
    new Date(atSeconds * 1000).toISOString(),
    bucketOf(atSeconds, kind),
    WEIGHT[kind],
    atSeconds - EPOCH0_SECONDS,
  ])
}

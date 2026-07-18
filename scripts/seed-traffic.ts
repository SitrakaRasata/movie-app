import { sql } from 'drizzle-orm'
import { mulberry32, poissonArrivals } from '@/domain/trending/random'
import { COOLDOWN_SECONDS, WEIGHT, type EventKind } from '@/domain/trending/weights'
import { db, events } from '@/server/db'
import { discoverMovies, upsertMovies } from '@/server/tmdb'
import { rebuildTrending } from '@/server/trending'

const SPAN_DAYS = 14
const SPAN = SPAN_DAYS * 86_400
const SEED = 20_260_805
const BATCH = 500

type SeedEvent = typeof events.$inferInsert

/**
 * Generates a plausible fortnight of attention so the public demo is not an empty
 * leaderboard. Each movie gets a Poisson arrival process whose rate is proportional
 * to its TMDB popularity; decay then makes the older half of that history weigh
 * very little, exactly as real traffic would.
 */
async function main() {
  const movies = await discoverMovies()
  if (movies.length === 0) throw new Error('TMDB returned no movies — check TMDB_READ_TOKEN')
  await upsertMovies(movies)

  const rng = mulberry32(SEED)
  const now = Math.floor(Date.now() / 1000)
  const start = now - SPAN

  const rows: SeedEvent[] = []
  let visitor = 0

  movies.forEach((movie, rank) => {
    // Rank 0 gets ~120 impressions over the fortnight, decreasing with rank.
    const impressionRate = (120 / SPAN) * (1 / (1 + rank * 0.35))
    for (const kind of ['impression', 'view'] as EventKind[]) {
      const rate = kind === 'impression' ? impressionRate : impressionRate * 0.25
      for (const offset of poissonArrivals(rate, SPAN, rng)) {
        const at = Math.floor(start + offset)
        rows.push({
          movieId: movie.id,
          visitorId: `seed-${visitor++}`,
          kind,
          occurredAt: new Date(at * 1000),
          bucket: Math.floor(at / COOLDOWN_SECONDS[kind]),
        })
      }
    }
  })

  await db.execute(sql.raw('TRUNCATE trending, events RESTART IDENTITY'))
  for (let i = 0; i < rows.length; i += BATCH) {
    await db
      .insert(events)
      .values(rows.slice(i, i + BATCH))
      .onConflictDoNothing()
  }

  // Materialise the accumulators from the journal — the same path the rebuild
  // test exercises, so the seed cannot silently drift from production behaviour.
  await rebuildTrending()

  console.log(`seeded ${rows.length} events across ${movies.length} movies over ${SPAN_DAYS} days`)
  console.log(`weights: impression=${WEIGHT.impression}, view=${WEIGHT.view}`)
}

main().catch((error) => {
  console.error(error)
  // Set the code rather than exiting, so pending handles unwind cleanly.
  process.exitCode = 1
})

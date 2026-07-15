import Link from 'next/link'
import { MovieGrid } from '@/components/MovieGrid'
import { SearchForm } from '@/components/SearchForm'
import { HALF_LIFE_LABELS, HALF_LIVES_SECONDS } from '@/domain/trending/weights'
import { discoverMovies, upsertMovies } from '@/server/tmdb'
import { track } from '@/server/track'
import { getTrending } from '@/server/trending'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>
}) {
  const { window } = await searchParams
  const halfLife = HALF_LIVES_SECONDS.find((h) => String(h) === window) ?? 86_400

  const { entries } = await getTrending(halfLife)

  // Cold start: with no recorded attention yet, fall back to TMDB popularity so
  // the page is never empty, and seed the movie cache while we are at it.
  let list = entries
  if (list.length === 0) {
    const discovered = await discoverMovies()
    await upsertMovies(discovered)
    list = discovered.map((m) => ({ ...m, syncedAt: new Date(), logAcc: 0, score: 0 }))
  }

  await track(
    list.map((m) => m.id),
    'impression',
  )

  const scores = new Map(list.map((m) => [m.id, m.score]))

  return (
    <>
      <SearchForm />
      <section>
        <div className="flex flex-wrap items-baseline gap-4">
          <h1 className="text-2xl font-bold">Trending</h1>
          <div className="flex gap-3 text-sm">
            {HALF_LIVES_SECONDS.map((h) => (
              <Link
                key={h}
                href={`/?window=${h}`}
                className={h === halfLife ? 'text-accent' : 'text-muted hover:text-text'}
              >
                {HALF_LIFE_LABELS[h]}
              </Link>
            ))}
          </div>
        </div>
        <MovieGrid movies={list} scores={scores} emptyMessage="No attention recorded yet." />
      </section>
    </>
  )
}

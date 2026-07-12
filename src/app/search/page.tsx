import { MovieGrid } from '@/components/MovieGrid'
import { SearchForm } from '@/components/SearchForm'
import { searchMovies, upsertMovies } from '@/server/tmdb'
import { track } from '@/server/track'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const results = await searchMovies(q)

  await upsertMovies(results)
  await track(
    results.map((m) => m.id),
    'impression',
  )

  return (
    <>
      <SearchForm defaultValue={q} />
      <section>
        <h1 className="text-2xl font-bold">{q ? `Results for "${q}"` : 'Search'}</h1>
        <MovieGrid
          movies={results}
          emptyMessage={q ? `No movie matches "${q}".` : 'Type a title above.'}
        />
      </section>
    </>
  )
}

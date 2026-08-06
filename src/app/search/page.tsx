import { MovieGrid } from '@/components/MovieGrid'
import { SearchForm } from '@/components/SearchForm'
import { searchMovies, upsertMovies } from '@/server/tmdb'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const results = await searchMovies(q)

  // Cached, but deliberately not tracked. Matching a query is not attention: it
  // says what the searcher typed, not what anyone looked at, and counting it let
  // one search put twenty arbitrary movies into the ranking. They enter it when
  // somebody actually opens one.
  await upsertMovies(results)

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

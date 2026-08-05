import { MovieCard, type CardMovie } from './MovieCard'

export function MovieGrid({
  movies,
  scores,
  emptyMessage = 'Nothing to show yet.',
}: {
  movies: CardMovie[]
  scores?: Map<number, number>
  emptyMessage?: string
}) {
  if (movies.length === 0) {
    return <p className="mt-6 text-muted">{emptyMessage}</p>
  }
  return (
    <ul className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
      {movies.map((movie, index) => (
        <li key={movie.id}>
          {/* One widest-breakpoint row, which is as much as can be above the fold. */}
          <MovieCard movie={movie} score={scores?.get(movie.id)} priority={index < 4} />
        </li>
      ))}
    </ul>
  )
}

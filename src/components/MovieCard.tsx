import Image from 'next/image'
import Link from 'next/link'

export type CardMovie = {
  id: number
  title: string
  posterPath: string | null
  releaseDate: string | null
  voteAverage: number | null
  originalLanguage: string | null
}

export function MovieCard({ movie, score }: { movie: CardMovie; score?: number }) {
  const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : 'N/A'
  const rating = movie.voteAverage ? movie.voteAverage.toFixed(1) : 'N/A'

  return (
    <Link
      href={`/movie/${movie.id}`}
      className="group block overflow-hidden rounded-2xl bg-surface transition-colors hover:bg-surface-2"
    >
      <div className="relative aspect-[2/3] w-full bg-surface-2">
        {movie.posterPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
            alt={movie.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-sm text-muted">
            No poster
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="truncate font-medium">{movie.title}</h3>
        <p className="text-sm text-muted">
          {rating} · {movie.originalLanguage ?? 'N/A'} · {year}
        </p>
        {score !== undefined && <p className="text-sm text-accent">{score.toFixed(2)} pts</p>}
      </div>
    </Link>
  )
}

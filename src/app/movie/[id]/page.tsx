import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getMovie, upsertMovies } from '@/server/tmdb'
import { track } from '@/server/track'

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const movieId = Number(id)
  if (!Number.isInteger(movieId)) notFound()

  const movie = await getMovie(movieId)
  if (!movie) notFound()

  await upsertMovies([movie])
  await track([movie.id], 'view')

  return (
    <article className="flex flex-col gap-8 sm:flex-row">
      <div className="relative aspect-[2/3] w-full max-w-xs shrink-0 overflow-hidden rounded-2xl bg-surface-2">
        {movie.posterPath && (
          <Image
            src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
            alt={movie.title}
            fill
            sizes="320px"
            className="object-cover"
            priority
          />
        )}
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{movie.title}</h1>
        <p className="text-muted">
          {movie.voteAverage?.toFixed(1) ?? 'N/A'} · {movie.originalLanguage ?? 'N/A'} ·{' '}
          {movie.releaseDate?.slice(0, 4) ?? 'N/A'}
        </p>
        <p className="text-sm text-muted">
          Opening this page contributes a weighted view to the trending score.
        </p>
      </div>
    </article>
  )
}

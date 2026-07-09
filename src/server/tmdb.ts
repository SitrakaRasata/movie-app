import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, movies } from './db'
import { env } from './env'

const BASE = 'https://api.themoviedb.org/3'

const tmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  poster_path: z.string().nullish(),
  release_date: z.string().nullish(),
  vote_average: z.number().nullish(),
  original_language: z.string().nullish(),
})

const tmdbListSchema = z.object({ results: z.array(z.unknown()) })

export type TmdbMovie = {
  id: number
  title: string
  posterPath: string | null
  releaseDate: string | null
  voteAverage: number | null
  originalLanguage: string | null
}

function toMovie(raw: z.infer<typeof tmdbMovieSchema>): TmdbMovie {
  return {
    id: raw.id,
    title: raw.title,
    posterPath: raw.poster_path ?? null,
    releaseDate: raw.release_date || null,
    voteAverage: raw.vote_average ?? null,
    originalLanguage: raw.original_language ?? null,
  }
}

/** Parses defensively: a TMDB schema change degrades the list, it does not crash the page. */
export function parseTmdbList(payload: unknown): TmdbMovie[] {
  const list = tmdbListSchema.safeParse(payload)
  if (!list.success) return []
  return list.data.results.flatMap((entry) => {
    const parsed = tmdbMovieSchema.safeParse(entry)
    return parsed.success ? [toMovie(parsed.data)] : []
  })
}

async function tmdb(path: string): Promise<unknown> {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${env.TMDB_READ_TOKEN}`,
    },
    // Next's own fetch cache. One hour of reuse keeps us far below TMDB's quota
    // and costs nothing to maintain.
    next: { revalidate: 3600 },
  })
  if (!response.ok) {
    console.error(`TMDB ${path} responded ${response.status}`)
    return null
  }
  return response.json()
}

export async function discoverMovies(): Promise<TmdbMovie[]> {
  return parseTmdbList(await tmdb('/discover/movie?sort_by=popularity.desc'))
}

export async function searchMovies(query: string): Promise<TmdbMovie[]> {
  if (!query.trim()) return []
  return parseTmdbList(await tmdb(`/search/movie?query=${encodeURIComponent(query)}`))
}

export async function getMovie(id: number): Promise<TmdbMovie | null> {
  const payload = await tmdb(`/movie/${id}`)
  const parsed = tmdbMovieSchema.safeParse(payload)
  return parsed.success ? toMovie(parsed.data) : null
}

/** Write-through cache: every movie we display gets a row, so ranking can join on it. */
export async function upsertMovies(list: TmdbMovie[]): Promise<void> {
  if (list.length === 0) return
  await db
    .insert(movies)
    .values(
      list.map((m) => ({
        id: m.id,
        title: m.title,
        posterPath: m.posterPath,
        releaseDate: m.releaseDate,
        voteAverage: m.voteAverage,
        originalLanguage: m.originalLanguage,
      })),
    )
    .onConflictDoUpdate({
      target: movies.id,
      set: {
        title: sql`excluded.title`,
        posterPath: sql`excluded.poster_path`,
        releaseDate: sql`excluded.release_date`,
        voteAverage: sql`excluded.vote_average`,
        originalLanguage: sql`excluded.original_language`,
        syncedAt: sql`now()`,
      },
    })
}

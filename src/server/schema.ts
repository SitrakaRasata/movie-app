import {
  bigint,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import type { EventKind } from '@/domain/trending/weights'

/** Write-through cache of TMDB. Only movies we have actually shown get a row. */
export const movies = pgTable('movies', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  posterPath: text('poster_path'),
  releaseDate: text('release_date'),
  voteAverage: doublePrecision('vote_average'),
  originalLanguage: text('original_language'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Append-only journal. The source of truth; `trending` is derived from it. */
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    movieId: integer('movie_id')
      .notNull()
      .references(() => movies.id, { onDelete: 'cascade' }),
    visitorId: text('visitor_id').notNull(),
    kind: text('kind').$type<EventKind>().notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    bucket: bigint('bucket', { mode: 'number' }).notNull(),
  },
  (t) => [uniqueIndex('events_dedupe').on(t.visitorId, t.movieId, t.kind, t.bucket)],
)

/** Derived log-accumulators, one row per (movie, half-life). Rebuildable from `events`. */
export const trending = pgTable(
  'trending',
  {
    movieId: integer('movie_id')
      .notNull()
      .references(() => movies.id, { onDelete: 'cascade' }),
    halfLife: integer('half_life').notNull(),
    logAcc: doublePrecision('log_acc').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.movieId, t.halfLife] }),
    index('trending_rank').on(t.halfLife, t.logAcc.desc()),
  ],
)

export type Movie = typeof movies.$inferSelect

export type EventKind = 'impression' | 'view'

/** Relative importance of each interaction. A detail view signals far more intent
 *  than a card merely appearing in a rendered list. */
export const WEIGHT: Record<EventKind, number> = {
  impression: 1,
  view: 5,
}

/** One visitor may only contribute one event of a given kind per movie per window. */
export const COOLDOWN_SECONDS: Record<EventKind, number> = {
  impression: 6 * 3600,
  view: 1 * 3600,
}

/** "Hot now", "today", "this week". One accumulator row per movie per half-life. */
export const HALF_LIVES_SECONDS = [3600, 86400, 604800] as const

export type HalfLife = (typeof HALF_LIVES_SECONDS)[number]

/** Keyed by `HalfLife`, so adding a half-life without naming it is a type error. */
export const HALF_LIFE_LABELS: Record<HalfLife, string> = {
  3600: 'Hot now',
  86400: 'Today',
  604800: 'This week',
}

/** 2026-01-01T00:00:00Z. Fixed reference point for every exponent in the system. */
export const EPOCH0_SECONDS = 1_767_225_600

export function bucketOf(atSeconds: number, kind: EventKind): number {
  return Math.floor(atSeconds / COOLDOWN_SECONDS[kind])
}

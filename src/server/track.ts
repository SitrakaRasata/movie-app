import { after } from 'next/server'
import type { EventKind } from '@/domain/trending/weights'
import { recordEvents } from './trending'
import { getVisitorId } from './visitor'

/**
 * Records interactions after the response has been flushed, so ingestion never
 * costs the visitor any latency.
 *
 * Calling this during render is safe: React may render twice, but the unique
 * index on (visitor, movie, kind, bucket) makes a repeated insert a no-op. The
 * anti-abuse constraint doubles as the double-render guard.
 */
export async function track(movieIds: number[], kind: EventKind): Promise<void> {
  if (movieIds.length === 0) return
  const visitorId = await getVisitorId()
  const atSeconds = Math.floor(Date.now() / 1000)
  after(async () => {
    try {
      await recordEvents(visitorId, movieIds, kind, atSeconds)
    } catch (error) {
      // A failed count must never break a page that rendered correctly.
      console.error('failed to record events', error)
    }
  })
}

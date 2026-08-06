import { createHash } from 'node:crypto'
import { cookies, headers } from 'next/headers'

export const VISITOR_COOKIE = 'ct_vid'

/** Set by the proxy on the pass that mints the cookie, and only then. */
export const FRESH_VISITOR_HEADER = 'x-ct-fresh-visitor'

/**
 * A cookie identifies a returning visitor. It cannot identify a first one: the
 * proxy mints it during the very request being rendered, so trusting it there
 * would hand a brand-new identity — and a brand-new cooldown allowance — to
 * anyone who never stores it.
 *
 * On that first pass, fall back to a hash of where the request came from. It is
 * the weaker signal — one address and one browser collapse into a single
 * visitor — but it errs towards counting too little, which is the safe direction
 * for a ranking.
 */
export async function getVisitorId(): Promise<string> {
  const head = await headers()

  if (!head.get(FRESH_VISITOR_HEADER)) {
    const fromCookie = (await cookies()).get(VISITOR_COOKIE)?.value
    if (fromCookie) return fromCookie
  }

  const origin = `${head.get('x-forwarded-for') ?? ''}|${head.get('user-agent') ?? ''}`
  return `fp-${createHash('sha256').update(origin).digest('hex').slice(0, 32)}`
}

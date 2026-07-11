import { cookies } from 'next/headers'

export const VISITOR_COOKIE = 'ct_vid'

/** Read-only accessor. The cookie itself is written by the middleware,
 *  which is the only place able to set one outside a server action. */
export async function getVisitorId(): Promise<string | null> {
  const store = await cookies()
  return store.get(VISITOR_COOKIE)?.value ?? null
}

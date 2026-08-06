import { NextResponse, type NextRequest } from 'next/server'
import { FRESH_VISITOR_HEADER, VISITOR_COOKIE } from '@/server/visitor'

const ONE_YEAR = 60 * 60 * 24 * 365

export function proxy(request: NextRequest) {
  if (request.cookies.get(VISITOR_COOKIE)) return NextResponse.next()

  // Next hands a cookie set here to the render of this same request, which would
  // make every cookie-less caller look like a returning visitor. Mark the pass so
  // the app knows the identity is not yet proven.
  const forwarded = new Headers(request.headers)
  forwarded.set(FRESH_VISITOR_HEADER, '1')

  const response = NextResponse.next({ request: { headers: forwarded } })
  response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ONE_YEAR,
    path: '/',
  })
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

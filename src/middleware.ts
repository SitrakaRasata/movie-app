import { NextResponse, type NextRequest } from 'next/server'
import { VISITOR_COOKIE } from '@/server/visitor'

const ONE_YEAR = 60 * 60 * 24 * 365

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  if (!request.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: ONE_YEAR,
      path: '/',
    })
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

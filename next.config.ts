import type { NextConfig } from 'next'

/**
 * No Content-Security-Policy: Next inlines bootstrap scripts, so a useful one
 * needs a per-request nonce threaded through the document, and a policy with
 * `unsafe-inline` would only look like protection. Framing and sniffing are
 * closed off here instead, which costs nothing and is not theatre.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const config: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'image.tmdb.org' }],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default config

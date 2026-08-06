import type { MetadataRoute } from 'next'

/**
 * Crawlers keep no cookies, so each fetch reaches the tracker as a stranger. The
 * fingerprint fallback caps what that can distort, but walking every movie page
 * still records views nobody made. Landing pages stay indexable; the pages that
 * write events do not.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/search', '/movie/'],
    },
  }
}

import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'CinéTaste',
  description: 'Movie trending ranked by exponentially decaying attention.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4 sm:px-8">
            <Link href="/" className="font-semibold">
              CinéTaste
            </Link>
            <Link href="/model" className="text-sm text-muted hover:text-text">
              How the ranking works
            </Link>
          </nav>
        </header>
        <main className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8">{children}</main>
      </body>
    </html>
  )
}

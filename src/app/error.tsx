'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted">The ranking could not be loaded.</p>
      <button
        onClick={reset}
        className="rounded-xl bg-accent px-5 py-3 font-medium hover:bg-accent-hover"
      >
        Try again
      </button>
    </div>
  )
}

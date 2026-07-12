import Form from 'next/form'

/** A plain GET form. The query lives in the URL, so results are shareable and
 *  navigable, and no debounce logic is needed anywhere. */
export function SearchForm({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <Form action="/search" className="flex gap-2">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Search for a movie"
        aria-label="Search for a movie"
        className="flex-1 rounded-xl bg-surface px-4 py-3 outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        className="rounded-xl bg-accent px-5 py-3 font-medium transition-colors hover:bg-accent-hover"
      >
        Search
      </button>
    </Form>
  )
}

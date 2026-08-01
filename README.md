# CinéTaste

A movie discovery app whose trending ranking is driven by an exponentially
decaying score over its own visitors' attention.

## The idea

A movie's score is the sum of the interactions it has received, each discounted
by how long ago it happened:

    S(t) = Σ wᵢ · e^(−λ(t − tᵢ))        λ = ln 2 / half-life

Recomputing that sum on every read does not scale. Factoring the constant out
gives an accumulator that only ever needs an O(1) update:

    S(t) = e^(−λt) · A                  A = Σ wᵢ · e^(λtᵢ)

Two things follow, and they shape the whole application:

- **Ingestion is a single statement.** No rescan of history, ever.
- **Ranking never applies the decay.** `e^(−λt)` is positive and shared by every
  movie, so it cannot change their order — sorting by `A` is enough. There is no
  scheduled job anywhere in this codebase, because the ranking decays correctly
  on its own.

`A` overflows a float64 quickly, so it is stored as `log A` and updated with
log-sum-exp, `logaddexp(a, b) = max(a, b) + ln(1 + e^−|a − b|)`, which keeps it
finite for decades.

Three half-lives run in parallel — 1 hour, 24 hours and 7 days — giving the
"hot now", "today" and "this week" views. `/model` plots the curves and lets you
look ahead in time to watch the ranking reorder itself.

## Anti-abuse

One visitor may only contribute one event of a given kind per movie per cooldown
window. This is enforced by a unique index on `(visitor, movie, kind, bucket)`
where `bucket = ⌊t / cooldown⌋`, rather than by application code, which makes it
race-free — and it doubles as protection against a page rendering twice.

## Data model

`events` is the source of truth; `trending` is a derived cache that can be
rebuilt from it at any time. `tests/server/ranking.test.ts` proves that claim by
replaying the journal and comparing the result with the incrementally maintained
accumulators.

## Stack

Next.js 16 (App Router, Server Components) · TypeScript · Drizzle ORM ·
Postgres · Tailwind CSS · Zod · Vitest with fast-check · Playwright

## Running locally

Requires Node 24, pnpm and a Postgres 16 server.

    pnpm install
    cp .env.example .env.local    # then fill in the three values
    pnpm db:migrate
    pnpm seed                     # generates a fortnight of plausible traffic
    pnpm dev

## Tests

    pnpm test    # property tests + Postgres integration tests (in-process, no Docker)
    pnpm e2e     # end-to-end, against a production build

The decay maths lives in `src/domain/trending/` and imports nothing — not the
database, not the framework, not even the system clock. Time is always a
parameter, which is what makes the property tests possible:

- a score is exactly halved after one half-life
- ranking order is invariant under time translation
- ingestion is commutative
- accumulators stay finite across ten years and six orders of weight magnitude

The integration tests run against real Postgres compiled to WebAssembly, so the
hand-written SQL is executed by the same engine that serves production. One of
them re-implements the ingest statement in TypeScript and asserts the two agree
to nine decimals, because log-sum-exp existing in both languages is the one place
this design could quietly drift.

Movie data is provided by [TMDB](https://www.themoviedb.org/).

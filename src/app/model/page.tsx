import { DecayExplorer, type ExplorerEntry } from '@/components/DecayExplorer'
import { HALF_LIVES_SECONDS, type HalfLife } from '@/domain/trending/weights'
import { getTrending } from '@/server/trending'

/** Read at request time. Prerendering would freeze the accumulators into the build
 *  output, and would make a database reachable at build time a requirement. */
export const dynamic = 'force-dynamic'

export default async function ModelPage() {
  // One set of accumulators per half-life. They are not interchangeable: each is
  // built with its own lambda, so scoring one with another's rate is meaningless.
  const snapshots = await Promise.all(HALF_LIVES_SECONDS.map((h) => getTrending(h, 12)))
  const series = Object.fromEntries(
    HALF_LIVES_SECONDS.map((h, i) => [
      h,
      snapshots[i].entries.map(({ id, title, logAcc }) => ({ id, title, logAcc })),
    ]),
  ) as Record<HalfLife, ExplorerEntry[]>

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">How the ranking works</h1>
        <p className="max-w-2xl text-muted">
          Every interaction adds weight to a movie, and that weight decays exponentially. A score is
          the sum of past events, each discounted by <code>e^(-λΔt)</code>, with λ = ln 2 divided by
          the half-life.
        </p>
        <p className="max-w-2xl text-muted">
          Scores are stored as logarithms and updated with log-sum-exp, which keeps them finite for
          decades. Ranking never applies the decay at all: it is a positive factor shared by every
          movie, so it cannot change their order. That is why this application has no scheduled job.
        </p>
      </div>
      <DecayExplorer series={series} nowSeconds={snapshots[0].nowSeconds} />
    </section>
  )
}

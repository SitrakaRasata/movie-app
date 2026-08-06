'use client'

import { useState } from 'react'
import { scoreAt } from '@/domain/trending/decay'
import { HALF_LIFE_LABELS, HALF_LIVES_SECONDS, type HalfLife } from '@/domain/trending/weights'

export type ExplorerEntry = { id: number; title: string; logAcc: number }

const WIDTH = 720
const HEIGHT = 220
const CURVES = 8
const AHEAD_MAX = 4
const AHEAD_STEP = 0.25

/** Shared by the curve and its swatch, so a line can never lose its label. */
function curveColor(index: number): string {
  return `hsl(${(index * 47) % 360} 70% 60%)`
}

function formatAhead(seconds: number): string {
  if (seconds === 0) return 'now'
  if (seconds < 86_400) return `+${Math.round(seconds / 3600)} h`
  const days = seconds / 86_400
  return `+${days.toFixed(Number.isInteger(days) ? 0 : 1)} d`
}

/** `nowSeconds` comes from the server so that render stays pure and the server and
 *  client agree on the baseline instant. */
export function DecayExplorer({
  series,
  nowSeconds,
}: {
  /** Keyed by half-life. An accumulator only means anything under the decay rate it
   *  was built with, so the key that picks the data is the key that picks lambda. */
  series: Record<HalfLife, ExplorerEntry[]>
  nowSeconds: number
}) {
  const [halfLife, setHalfLife] = useState<HalfLife>(86_400)
  const [ahead, setAhead] = useState(0)

  const entries = series[halfLife]

  // Normalised against the present, never against the shifted instant: a maximum
  // that moves with the slider would divide the decay straight back out and leave
  // the drawing frozen.
  const reference = Math.max(...entries.map((e) => scoreAt(e.logAcc, nowSeconds, halfLife)), 1e-9)

  const now = nowSeconds + ahead * halfLife
  const scored = entries
    .map((e) => ({ ...e, score: scoreAt(e.logAcc, now, halfLife) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, CURVES)

  const horizon = halfLife * 4

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-6">
        <label className="space-y-1">
          <span className="block text-sm text-muted">Half-life</span>
          <select
            value={halfLife}
            onChange={(e) => setHalfLife(Number(e.target.value) as HalfLife)}
            className="rounded-lg bg-surface px-3 py-2"
          >
            {HALF_LIVES_SECONDS.map((h) => (
              <option key={h} value={h}>
                {HALF_LIFE_LABELS[h]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 space-y-1">
          <span className="block text-sm text-muted">
            Look ahead: {ahead} half-lives — {formatAhead(ahead * halfLife)}
          </span>
          <input
            type="range"
            min={0}
            max={AHEAD_MAX}
            step={AHEAD_STEP}
            value={ahead}
            onChange={(e) => setAhead(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </label>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full rounded-2xl bg-surface p-2"
        role="img"
        aria-label={`Decay curves for the top ${scored.length} movies over ${formatAhead(horizon).replace('+', '')} at the ${HALF_LIFE_LABELS[halfLife]} half-life. The ranking is listed below.`}
      >
        {scored.map((entry, i) => {
          const points = Array.from({ length: 60 }, (_, step) => {
            const t = now + (step / 59) * horizon
            const y = scoreAt(entry.logAcc, t, halfLife) / reference
            return `${(step / 59) * WIDTH},${HEIGHT - y * (HEIGHT - 20) - 10}`
          }).join(' ')
          return (
            <polyline
              key={entry.id}
              points={points}
              fill="none"
              stroke={curveColor(i)}
              strokeWidth="2"
            />
          )
        })}
      </svg>

      <p className="max-w-2xl text-sm text-muted">
        Sliding forward divides every curve by the same factor, so the ranking below never reorders
        — that invariance is exactly why no scheduled job is needed. Changing the half-life does
        reorder it, because each one accumulates its own history.
      </p>

      <ol className="space-y-2">
        {scored.map((entry, i) => (
          <li key={entry.id} className="flex items-baseline justify-between gap-4">
            <span>
              <span
                aria-hidden
                className="mr-2 inline-block size-2.5 rounded-xs align-middle"
                style={{ background: curveColor(i) }}
              />
              <span className="text-muted">{i + 1}.</span> {entry.title}
            </span>
            <span className="text-sm text-accent">{entry.score.toFixed(3)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

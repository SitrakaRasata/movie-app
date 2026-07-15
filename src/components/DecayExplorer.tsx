'use client'

import { useState } from 'react'
import { scoreAt } from '@/domain/trending/decay'
import { HALF_LIFE_LABELS, HALF_LIVES_SECONDS } from '@/domain/trending/weights'

export type ExplorerEntry = { id: number; title: string; logAcc: number }

const WIDTH = 720
const HEIGHT = 220

/** `nowSeconds` comes from the server so that render stays pure and the server and
 *  client agree on the baseline instant. The slider moves time forward from there. */
export function DecayExplorer({
  entries,
  nowSeconds,
}: {
  entries: ExplorerEntry[]
  nowSeconds: number
}) {
  const [halfLife, setHalfLife] = useState<number>(86_400)
  const [hoursAhead, setHoursAhead] = useState(0)

  const now = nowSeconds + hoursAhead * 3600
  const scored = entries
    .map((e) => ({ ...e, score: scoreAt(e.logAcc, now, halfLife) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  const max = Math.max(...scored.map((s) => s.score), 1e-9)
  const horizon = halfLife * 4

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-6">
        <label className="space-y-1">
          <span className="block text-sm text-muted">Half-life</span>
          <select
            value={halfLife}
            onChange={(e) => setHalfLife(Number(e.target.value))}
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
          <span className="block text-sm text-muted">Look ahead: +{hoursAhead} h</span>
          <input
            type="range"
            min={0}
            max={336}
            value={hoursAhead}
            onChange={(e) => setHoursAhead(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </label>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-2xl bg-surface p-2">
        {scored.map((entry, i) => {
          const points = Array.from({ length: 60 }, (_, step) => {
            const t = now + (step / 59) * horizon
            const y = scoreAt(entry.logAcc, t, halfLife) / max
            return `${(step / 59) * WIDTH},${HEIGHT - y * (HEIGHT - 20) - 10}`
          }).join(' ')
          return (
            <polyline
              key={entry.id}
              points={points}
              fill="none"
              stroke={`hsl(${(i * 47) % 360} 70% 60%)`}
              strokeWidth="2"
            />
          )
        })}
      </svg>

      <ol className="space-y-2">
        {scored.map((entry, i) => (
          <li key={entry.id} className="flex items-baseline justify-between gap-4">
            <span>
              <span className="text-muted">{i + 1}.</span> {entry.title}
            </span>
            <span className="text-sm text-accent">{entry.score.toFixed(3)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

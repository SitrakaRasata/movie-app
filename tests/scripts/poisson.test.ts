import { describe, expect, it } from 'vitest'
import { mulberry32, poissonArrivals } from '@/domain/trending/random'

describe('mulberry32', () => {
  it('is reproducible for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('stays within [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('poissonArrivals', () => {
  it('returns strictly increasing timestamps inside the span', () => {
    const arrivals = poissonArrivals(0.001, 86_400, mulberry32(1))
    expect(arrivals.length).toBeGreaterThan(0)
    arrivals.forEach((t, i) => {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(86_400)
      if (i > 0) expect(t).toBeGreaterThan(arrivals[i - 1])
    })
  })

  it('produces roughly rate * span arrivals on average', () => {
    const rate = 0.002
    const span = 86_400
    const counts = Array.from({ length: 30 }, (_, s) => poissonArrivals(rate, span, mulberry32(s)).length)
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length
    expect(mean).toBeGreaterThan(rate * span * 0.7)
    expect(mean).toBeLessThan(rate * span * 1.3)
  })
})

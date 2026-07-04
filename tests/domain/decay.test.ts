import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { EMPTY_ACC, decayRate, ingest, logAdd, scoreAt } from '@/domain/trending/decay'
import { EPOCH0_SECONDS } from '@/domain/trending/weights'

const HL = 86_400
const T0 = EPOCH0_SECONDS + 1_000

const time = () => fc.integer({ min: EPOCH0_SECONDS, max: EPOCH0_SECONDS + 10 * 365 * 86_400 })
const weight = () => fc.double({ min: 1e-3, max: 1e3, noNaN: true })
const halfLife = () => fc.constantFrom(3600, 86_400, 604_800)

describe('logAdd', () => {
  it('treats EMPTY_ACC as the identity element', () => {
    expect(logAdd(EMPTY_ACC, 3)).toBe(3)
    expect(logAdd(3, EMPTY_ACC)).toBe(3)
  })

  it('returns EMPTY_ACC when both sides are empty (no NaN)', () => {
    expect(logAdd(EMPTY_ACC, EMPTY_ACC)).toBe(EMPTY_ACC)
  })

  it('agrees with naive log(exp(a) + exp(b)) in a safe range', () => {
    expect(logAdd(1, 2)).toBeCloseTo(Math.log(Math.E ** 1 + Math.E ** 2), 12)
  })
})

describe('decay properties', () => {
  it('halves the score after exactly one half-life', () => {
    fc.assert(
      fc.property(weight(), halfLife(), (w, hl) => {
        const acc = ingest(EMPTY_ACC, w, T0, hl)
        const now = scoreAt(acc, T0, hl)
        const later = scoreAt(acc, T0 + hl, hl)
        expect(now).toBeCloseTo(w, 9)
        expect(later / now).toBeCloseTo(0.5, 12)
      }),
    )
  })

  it('preserves ranking order at every future instant', () => {
    fc.assert(
      fc.property(weight(), weight(), time(), time(), halfLife(), (wa, wb, ta, tb, hl) => {
        const a = ingest(EMPTY_ACC, wa, ta, hl)
        const b = ingest(EMPTY_ACC, wb, tb, hl)
        const later = Math.max(ta, tb) + 5 * hl
        expect(Math.sign(a - b)).toBe(Math.sign(scoreAt(a, later, hl) - scoreAt(b, later, hl)))
      }),
    )
  })

  it('is commutative in ingestion order', () => {
    fc.assert(
      fc.property(weight(), time(), weight(), time(), halfLife(), (w1, t1, w2, t2, hl) => {
        const forward = ingest(ingest(EMPTY_ACC, w1, t1, hl), w2, t2, hl)
        const backward = ingest(ingest(EMPTY_ACC, w2, t2, hl), w1, t1, hl)
        expect(forward).toBeCloseTo(backward, 9)
      }),
    )
  })

  it('never decreases the accumulator', () => {
    fc.assert(
      fc.property(weight(), time(), halfLife(), (w, t, hl) => {
        const before = ingest(EMPTY_ACC, 1, EPOCH0_SECONDS, hl)
        expect(ingest(before, w, t, hl)).toBeGreaterThanOrEqual(before)
      }),
    )
  })

  it('stays finite across ten years and six orders of weight magnitude', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(weight(), time()), { maxLength: 50 }),
        halfLife(),
        (events, hl) => {
          const acc = events.reduce((a, [w, t]) => ingest(a, w, t, hl), EMPTY_ACC)
          if (events.length === 0) return
          expect(Number.isFinite(acc)).toBe(true)
          const score = scoreAt(acc, EPOCH0_SECONDS + 10 * 365 * 86_400, hl)
          expect(Number.isNaN(score)).toBe(false)
        },
      ),
    )
  })
})

describe('decayRate', () => {
  it('is ln(2) over the half-life', () => {
    expect(decayRate(HL)).toBeCloseTo(Math.LN2 / HL, 15)
  })
})

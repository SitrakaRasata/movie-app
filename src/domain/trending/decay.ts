import { EPOCH0_SECONDS } from './weights'

/** An accumulator holding no events. log(0) = -Infinity, the identity for logAdd. */
export const EMPTY_ACC = Number.NEGATIVE_INFINITY

export function decayRate(halfLifeSeconds: number): number {
  return Math.LN2 / halfLifeSeconds
}

/**
 * log(exp(a) + exp(b)), computed without ever materialising exp(a) or exp(b).
 * Factoring out the larger term keeps the remaining exponential in [0, 1].
 */
export function logAdd(a: number, b: number): number {
  if (a === EMPTY_ACC) return b
  if (b === EMPTY_ACC) return a
  const hi = Math.max(a, b)
  return hi + Math.log1p(Math.exp(-Math.abs(a - b)))
}

/** The log-space contribution of a single event: ln(w) + lambda * (t - EPOCH0). */
function eventTerm(weight: number, atSeconds: number, halfLifeSeconds: number): number {
  return Math.log(weight) + decayRate(halfLifeSeconds) * (atSeconds - EPOCH0_SECONDS)
}

export function ingest(
  logAcc: number,
  weight: number,
  atSeconds: number,
  halfLifeSeconds: number,
): number {
  return logAdd(logAcc, eventTerm(weight, atSeconds, halfLifeSeconds))
}

/**
 * The decayed score at a given instant. Note this is only ever needed for display:
 * ranking uses logAcc directly, because exp(-lambda * now) is a positive factor
 * common to every movie and therefore cannot change their order.
 */
export function scoreAt(logAcc: number, nowSeconds: number, halfLifeSeconds: number): number {
  if (logAcc === EMPTY_ACC) return 0
  return Math.exp(logAcc - decayRate(halfLifeSeconds) * (nowSeconds - EPOCH0_SECONDS))
}

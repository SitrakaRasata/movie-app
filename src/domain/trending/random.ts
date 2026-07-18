/** Small seeded PRNG. Five lines instead of a dependency, and it makes the seed
 *  script reproducible, which `Math.random` would not. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

/**
 * Arrival times of a homogeneous Poisson process over [0, spanSeconds].
 * Inter-arrival times of such a process are exponentially distributed, and
 * -ln(U)/rate transforms a uniform draw into exactly that distribution.
 */
export function poissonArrivals(rate: number, spanSeconds: number, rng: () => number): number[] {
  const arrivals: number[] = []
  let t = 0
  for (;;) {
    t += -Math.log(1 - rng()) / rate
    if (t > spanSeconds) return arrivals
    arrivals.push(t)
  }
}

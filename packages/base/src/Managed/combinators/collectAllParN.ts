import type { Managed } from '../core'

import { identity } from '@principia/prelude/function'

import { foreachParN_, foreachUnitParN_ } from './foreachParN'

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 */
export function collectAllParN_<R, E, A>(mas: Iterable<Managed<R, E, A>>, n: number): Managed<R, E, ReadonlyArray<A>> {
  return foreachParN_(mas, n, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 */
export function collectAllParN(
  n: number
): <R, E, A>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, ReadonlyArray<A>> {
  return (mas) => collectAllParN_(mas, n)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 */
export function collectAllUnitParN_<R, E, A>(mas: Iterable<Managed<R, E, A>>, n: number): Managed<R, E, void> {
  return foreachUnitParN_(mas, n, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 */
export function collectAllUnitParN(n: number): <R, E, A>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, void> {
  return (mas) => collectAllUnitParN_(mas, n)
}

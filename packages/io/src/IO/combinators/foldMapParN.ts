import type { IO } from '../core'
import type { Monoid } from '@principia/base/Monoid'

import { mergeAllParN_ } from './mergeAllParN'

/**
 * Combines an array of `IO`s in parallel using a `Monoid`, using only up to `n` fibers
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapParN_<M>(
  M: Monoid<M>
): (n: number) => <R, E, A>(as: ReadonlyArray<IO<R, E, A>>, f: (a: A) => M) => IO<R, E, M> {
  return (n) => (as, f) => mergeAllParN_(n)(as, M.nat, (m, a) => M.combine_(m, f(a)))
}

/**
 * Combines an array of `IO`s in parallel using a `Monoid`, using only up to `n` fibers
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapParN<M>(
  M: Monoid<M>
): (n: number) => <A>(f: (a: A) => M) => <R, E>(as: ReadonlyArray<IO<R, E, A>>) => IO<R, E, M> {
  return (n) => (f) => (as) => foldMapParN_(M)(n)(as, f)
}

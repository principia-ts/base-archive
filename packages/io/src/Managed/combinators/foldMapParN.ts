import type { Managed } from '../core'
import type { Monoid } from '@principia/base/typeclass'

import { mergeAllParN_ } from './mergeAllParN'

/**
 * Combines an array of `Managed` effects in parallel using a `Monoid`, using only up to `n` fibers
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapParN_<M>(
  M: Monoid<M>
): (n: number) => <R, E, A>(mas: Iterable<Managed<R, E, A>>, f: (a: A) => M) => Managed<R, E, M> {
  return (n) => (mas, f) => mergeAllParN_(n)(mas, M.nat, (m, a) => M.combine_(m, f(a)))
}

/**
 * Combines an array of `Managed` effects in parallel using a `Monoid`, using only up to `n` fibers
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapParN<M>(
  M: Monoid<M>
): (n: number) => <A>(f: (a: A) => M) => <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, M> {
  return (n) => (f) => (mas) => foldMapParN_(M)(n)(mas, f)
}

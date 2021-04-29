import type { Monoid } from '../../Monoid'
import type { Managed } from '../core'

import { mergeAllParN_ } from './mergeAllParN'

/**
 * Combines an array of `Managed` effects in parallel using a `Monoid`, using only up to `n` fibers
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapParN_<M>(
  M: Monoid<M>
): <R, E, A>(mas: Iterable<Managed<R, E, A>>, n: number, f: (a: A) => M) => Managed<R, E, M> {
  return (mas, n, f) => mergeAllParN_(mas, n, M.nat, (m, a) => M.combine_(m, f(a)))
}

/**
 * Combines an array of `Managed` effects in parallel using a `Monoid`, using only up to `n` fibers
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapParN<M>(
  M: Monoid<M>
): <A>(n: number, f: (a: A) => M) => <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, M> {
  return (n, f) => (mas) => foldMapParN_(M)(mas, n, f)
}

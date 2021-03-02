import type { Managed } from '../core'
import type { Monoid } from '@principia/base/typeclass'

import { mergeAllPar_ } from './mergeAllPar'

/**
 * Combines an array of `Managed` effects in parallel using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapPar_<M>(
  M: Monoid<M>
): <R, E, A>(mas: Iterable<Managed<R, E, A>>, f: (a: A) => M) => Managed<R, E, M> {
  return (mas, f) => mergeAllPar_(mas, M.nat, (m, a) => M.combine_(m, f(a)))
}

/**
 * Combines an array of `Managed` effects in parallel using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapPar<M>(
  M: Monoid<M>
): <A>(f: (a: A) => M) => <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, M> {
  return (f) => (mas) => foldMapPar_(M)(mas, f)
}

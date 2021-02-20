import type { IO } from '../core'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import { map, map_ } from '../core'
import { foreachParN } from './foreachParN'

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * This method will use up to `n` fibers.
 */
export function filterParN_(
  n: number
): <A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>) => IO<R, E, readonly A[]> {
  return (as, f) =>
    pipe(
      as,
      foreachParN(n)((a) => map_(f(a), (b) => (b ? O.Some(a) : O.None()))),
      map(A.compact)
    )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * This method will use up to `n` fibers.
 */
export function filterParN(
  n: number
): <A, R, E>(f: (a: A) => IO<R, E, boolean>) => (as: Iterable<A>) => IO<R, E, readonly A[]> {
  return (f) => (as) => filterParN_(n)(as, f)
}

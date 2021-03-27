// tracing: off

import type { IO } from '../core'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { traceAs } from '@principia/compile/util'

import { map, map_ } from '../core'
import { foreachParN } from './foreachParN'

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * This method will use up to `n` fibers.
 *
 * @trace 2
 */
export function filterParN_<A, R, E>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => IO<R, E, boolean>
): IO<R, E, readonly A[]> {
  return pipe(
    as,
    foreachParN(
      n,
      traceAs(f, (a) => map_(f(a), (b) => (b ? O.Some(a) : O.None())))
    ),
    map(A.compact)
  )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * This method will use up to `n` fibers.
 *
 * @trace 1
 */
export function filterParN<A, R, E>(
  n: number,
  f: (a: A) => IO<R, E, boolean>
): (as: Iterable<A>) => IO<R, E, readonly A[]> {
  return (as) => filterParN_(as, n, f)
}

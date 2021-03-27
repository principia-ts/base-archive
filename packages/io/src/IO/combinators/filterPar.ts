import type { IO } from '../core'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { traceAs } from '@principia/compile/util'

import { map, map_ } from '../core'
import { foreachPar } from './foreachPar'

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @trace 1
 */
export function filterPar_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>) {
  return pipe(as, foreachPar(traceAs(f, (a) => map_(f(a), (b) => (b ? O.Some(a) : O.None())))), map(A.compact))
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @trace 0
 */
export function filterPar<A, R, E>(f: (a: A) => IO<R, E, boolean>): (as: Iterable<A>) => IO<R, E, readonly A[]> {
  return (as) => filterPar_(as, f)
}

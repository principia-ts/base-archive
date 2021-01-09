import type { IO } from '../core'

import { identity } from '@principia/base/Function'
import * as I from '@principia/base/Iterable'

import { map_, recover } from '../core'
import { foreachParN_ } from './foreachParN'

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 */
export function partitionParN_(
  n: number
): <R, E, A, B>(as: Iterable<A>, f: (a: A) => IO<R, E, B>) => IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return (as, f) =>
    map_(
      foreachParN_(n)(as, (a) => recover(f(a))),
      I.partitionMap(identity)
    )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 */
export function partitionParN(
  n: number
): <R, E, A, B>(f: (a: A) => IO<R, E, B>) => (as: Iterable<A>) => IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return (f) => (as) => partitionParN_(n)(as, f)
}

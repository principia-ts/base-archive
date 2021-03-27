// tracng: off

import type { IO } from '../core'

import { identity } from '@principia/base/function'
import * as I from '@principia/base/Iterable'
import { traceAs } from '@principia/compile/util'

import { attempt, map_ } from '../core'
import { foreachParN_ } from './foreachParN'

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 *
 * @trace 2
 */
export function partitionParN_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => IO<R, E, B>
): IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return map_(
    foreachParN_(
      as,
      n,
      traceAs(f, (a) => attempt(f(a)))
    ),
    I.partitionMap(identity)
  )
}

/**
 * Feeds elements of type `A` to a function `f` that returns an IO.
 * Collects all successes and failures in parallel and returns the result as
 * a tuple.
 *
 * Unlike `partitionPar`, this method will use at most up to `n` fibers.
 *
 * @trace 1
 */
export function partitionParN<R, E, A, B>(
  n: number,
  f: (a: A) => IO<R, E, B>
): (as: Iterable<A>) => IO<R, never, readonly [Iterable<E>, Iterable<B>]> {
  return (as) => partitionParN_(as, n, f)
}

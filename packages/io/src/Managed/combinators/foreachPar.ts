import type { Managed } from '../core'

import { tuple } from '@principia/base/Function'

import { parallel, sequential } from '../../ExecutionStrategy'
import * as I from '../_internal/_io'
import { mapM_ } from '../core'
import { makeManagedReleaseMap } from './makeManagedReleaseMap'

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachPar<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>
): (as: Iterable<A>) => Managed<R, E, readonly B[]> {
  return (as) => foreachPar_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach_`.
 */
export function foreachPar_<R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, readonly B[]> {
  return mapM_(makeManagedReleaseMap(parallel), (parallelReleaseMap) => {
    const makeInnerMap = I.gives_(
      I.map_(makeManagedReleaseMap(sequential).io, ([_, x]) => x),
      (x: unknown) => tuple(x, parallelReleaseMap)
    )

    return I.foreachPar_(as, (a) =>
      I.map_(
        I.flatMap_(makeInnerMap, (innerMap) => I.gives_(f(a).io, (u: R) => tuple(u, innerMap))),
        ([_, b]) => b
      )
    )
  })
}

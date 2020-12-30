import type { Managed } from '../core'

import { tuple } from '@principia/base/data/Function'

import { parallelN, sequential } from '../../ExecutionStrategy'
import { foreachParN_ as effectForeachParN } from '../../IO/combinators/foreachParN'
import * as I from '../_internal/io'
import { mapM_ } from '../core'
import { makeManagedReleaseMap } from './makeManagedReleaseMap'

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export function foreachParN(
  n: number
): <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (as: Iterable<A>) => Managed<R, E, readonly B[]> {
  return (f) => (as) => foreachParN_(n)(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export function foreachParN_(n: number) {
  return <R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>): Managed<R, E, readonly B[]> =>
    mapM_(makeManagedReleaseMap(parallelN(n)), (parallelReleaseMap) => {
      const makeInnerMap = I.gives_(
        I.map_(makeManagedReleaseMap(sequential).io, ([_, x]) => x),
        (x: unknown) => tuple(x, parallelReleaseMap)
      )

      return effectForeachParN(n)(as, (a) =>
        I.map_(
          I.flatMap_(makeInnerMap, (innerMap) => I.gives_(f(a).io, (u: R) => tuple(u, innerMap))),
          ([_, b]) => b
        )
      )
    })
}

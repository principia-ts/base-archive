import type { Managed } from '../core'

import { pipe, tuple } from '@principia/base/Function'

import { parallel, sequential } from '../../ExecutionStrategy'
import * as I from '../_internal/_io'
import { mapM, mapM_ } from '../core'
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
  return pipe(
    makeManagedReleaseMap(parallel),
    mapM((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        makeManagedReleaseMap(sequential).io,
        I.map(([_, x]) => x),
        I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
      )

      return I.foreachPar_(as, (a) =>
        pipe(
          makeInnerMap,
          I.flatMap((innerMap) =>
            pipe(
              f(a).io,
              I.map(([_fin, r]) => r),
              I.gives((r0: R) => tuple(r0, innerMap))
            )
          )
        )
      )
    })
  )
}

export function foreachUnitPar_<R, E, A>(as: Iterable<A>, f: (a: A) => Managed<R, E, unknown>): Managed<R, E, void> {
  return pipe(
    makeManagedReleaseMap(parallel),
    mapM((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        makeManagedReleaseMap(sequential).io,
        I.map(([_, x]) => x),
        I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
      )

      return I.foreachUnitPar_(as, (a) =>
        pipe(
          makeInnerMap,
          I.flatMap((innerMap) =>
            pipe(
              f(a).io,
              I.map(([_fin, r]) => r),
              I.gives((r0: R) => tuple(r0, innerMap))
            )
          )
        )
      )
    })
  )
}

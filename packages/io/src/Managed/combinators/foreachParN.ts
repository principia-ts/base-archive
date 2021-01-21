import type { Managed } from '../core'

import { pipe, tuple } from '@principia/base/Function'

import { parallelN, sequential } from '../../ExecutionStrategy'
import { foreachParN_ as effectForeachParN } from '../../IO/combinators/foreachParN'
import { foreachUnitParN_ as effectForeachUnitParN } from '../../IO/combinators/foreachUnitParN'
import { mapM } from '../core'
import * as I from '../internal/io'
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
    pipe(
      makeManagedReleaseMap(parallelN(n)),
      mapM((parallelReleaseMap) => {
        const makeInnerMap = pipe(
          makeManagedReleaseMap(sequential).io,
          I.map(([_, x]) => x),
          I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
        )

        return effectForeachParN(n)(as, (a) =>
          pipe(
            makeInnerMap,
            I.chain((innerMap) =>
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

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel, discarding the results`.
 *
 * Unlike `foreachUnitPar`, this method will use at most up to `n` fibers.
 */
export function foreachUnitParN(
  n: number
): <R, E, A>(f: (a: A) => Managed<R, E, unknown>) => (as: Iterable<A>) => Managed<R, E, void> {
  return (f) => (as) => foreachUnitParN_(n)(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel, discarding the results`.
 *
 * Unlike `foreachUnitPar_`, this method will use at most up to `n` fibers.
 */
export function foreachUnitParN_(n: number) {
  return <R, E, A>(as: Iterable<A>, f: (a: A) => Managed<R, E, unknown>): Managed<R, E, void> =>
    pipe(
      makeManagedReleaseMap(parallelN(n)),
      mapM((parallelReleaseMap) => {
        const makeInnerMap = pipe(
          makeManagedReleaseMap(sequential).io,
          I.map(([_, x]) => x),
          I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
        )

        return effectForeachUnitParN(n)(as, (a) =>
          pipe(
            makeInnerMap,
            I.chain((innerMap) =>
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

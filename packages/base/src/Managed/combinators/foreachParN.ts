import type { Chunk } from '../../Chunk/core'
import type { Managed } from '../core'

import { tuple } from '@principia/prelude/tuple'

import { parallelN, sequential } from '../../ExecutionStrategy'
import { pipe } from '../../function'
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
export function foreachParN<R, E, A, B>(
  n: number,
  f: (a: A) => Managed<R, E, B>
): (as: Iterable<A>) => Managed<R, E, Chunk<B>> {
  return (as) => foreachParN_(as, n, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export function foreachParN_<R, E, A, B>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Managed<R, E, B>
): Managed<R, E, Chunk<B>> {
  return pipe(
    makeManagedReleaseMap(parallelN(n)),
    mapM((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        makeManagedReleaseMap(sequential).io,
        I.map(([_, x]) => x),
        I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
      )

      return effectForeachParN(as, n, (a) =>
        pipe(
          makeInnerMap,
          I.bind((innerMap) =>
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
export function foreachUnitParN<R, E, A>(
  n: number,
  f: (a: A) => Managed<R, E, unknown>
): (as: Iterable<A>) => Managed<R, E, void> {
  return (as) => foreachUnitParN_(as, n, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel, discarding the results`.
 *
 * Unlike `foreachUnitPar_`, this method will use at most up to `n` fibers.
 */
export function foreachUnitParN_<R, E, A>(
  as: Iterable<A>,
  n: number,
  f: (a: A) => Managed<R, E, unknown>
): Managed<R, E, void> {
  return pipe(
    makeManagedReleaseMap(parallelN(n)),
    mapM((parallelReleaseMap) => {
      const makeInnerMap = pipe(
        makeManagedReleaseMap(sequential).io,
        I.map(([_, x]) => x),
        I.gives((r0: unknown) => tuple(r0, parallelReleaseMap))
      )

      return effectForeachUnitParN(as, n, (a) =>
        pipe(
          makeInnerMap,
          I.bind((innerMap) =>
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

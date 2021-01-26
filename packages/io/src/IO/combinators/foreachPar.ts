import * as I from '../core'
import { foreachUnitPar_ } from './foreachUnitPar'

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachPar_ = <R, E, A, B>(as: Iterable<A>, f: (a: A) => I.IO<R, E, B>): I.IO<R, E, ReadonlyArray<B>> => {
  const arr = Array.from(as)

  return I.bind_(
    I.effectTotal<B[]>(() => []),
    (mut_array) => {
      function fn([a, n]: [A, number]) {
        return I.bind_(
          I.deferTotal(() => f(a)),
          (b) =>
            I.effectTotal(() => {
              mut_array[n] = b
            })
        )
      }
      return I.bind_(
        foreachUnitPar_(
          arr.map((a, n) => [a, n] as [A, number]),
          fn
        ),
        () => I.effectTotal(() => mut_array)
      )
    }
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachPar<R, E, A, B>(f: (a: A) => I.IO<R, E, B>): (as: Iterable<A>) => I.IO<R, E, ReadonlyArray<B>> {
  return (as) => foreachPar_(as, f)
}

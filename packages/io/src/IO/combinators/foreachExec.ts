import type { ExecutionStrategy } from '../../ExecutionStrategy'

import * as I from '../core'
import { foreachPar_ } from './foreachPar'
import { foreachParN_ } from './foreachParN'

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachExec_<R, E, A, B>(es: ExecutionStrategy, as: Iterable<A>, f: (a: A) => I.IO<R, E, B>) {
  switch (es._tag) {
    case 'Sequential': {
      return I.foreach_(as, f) as any
    }
    case 'Parallel': {
      return foreachPar_(as, f) as any
    }
    case 'ParallelN': {
      return foreachParN_(es.n)(as, f) as any
    }
  }
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachExec(
  es: ExecutionStrategy
): <R, E, A, B>(f: (a: A) => I.IO<R, E, B>) => (as: Iterable<A>) => I.IO<R, E, B> {
  return (f) => (as) => foreachExec_(es, as, f) as any
}

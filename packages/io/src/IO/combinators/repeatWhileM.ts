import type { IO } from '../core'

import { flatMap_, pure } from '../core'

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM_<R, E, A, R1, E1>(
  ef: IO<R, E, A>,
  f: (a: A) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return flatMap_(ef, (a) => flatMap_(f(a), (b) => (b ? repeatWhileM_(ef, f) : pure(a))))
}

/**
 * Repeats this effect while its error satisfies the specified effectful predicate.
 */
export function repeatWhileM<A, R1, E1>(
  f: (a: A) => IO<R1, E1, boolean>
): <R, E>(ef: IO<R, E, A>) => IO<R & R1, E1 | E, A> {
  return (ef) => repeatWhileM_(ef, f)
}

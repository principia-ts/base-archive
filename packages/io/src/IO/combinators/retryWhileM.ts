import type { IO } from "../core";

import { catchAll_, fail, flatMap_ } from "../core";

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 */
export function retryWhileM_<R, E, A, R1, E1>(
  fa: IO<R, E, A>,
  f: (e: E) => IO<R1, E1, boolean>
): IO<R & R1, E | E1, A> {
  return catchAll_(fa, (e) => flatMap_(f(e), (b) => (b ? retryWhileM_(fa, f) : fail(e))));
}

/**
 * Retries this effect while its error satisfies the specified effectful predicate.
 */
export function retryWhileM<E, R1, E1>(
  f: (e: E) => IO<R1, E1, boolean>
): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => retryWhileM_(fa, f);
}

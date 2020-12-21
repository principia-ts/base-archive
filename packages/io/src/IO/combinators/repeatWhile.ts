import type { IO } from "../core";

import { pure } from "../core";
import { repeatWhileM_ } from "./repeatWhileM";

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile_<R, E, A>(ef: IO<R, E, A>, f: (a: A) => boolean): IO<R, E, A> {
  return repeatWhileM_(ef, (a) => pure(f(a)));
}

/**
 * Repeats this effect while its error satisfies the specified predicate.
 */
export function repeatWhile<A>(f: (a: A) => boolean): <R, E>(ef: IO<R, E, A>) => IO<R, E, A> {
  return (ef) => repeatWhile_(ef, f);
}

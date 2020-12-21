import type { Managed } from "../core";

import { identity } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import { catchAll_, die, fail } from "../core";

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, E, A, E1>(
  ma: Managed<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
): Managed<R, E1, A> {
  return catchAll_(ma, (e) => O.fold_(pf(e), () => die(f(e)), fail));
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown
): <R, A>(ma: Managed<R, E, A>) => Managed<R, E1, A> {
  return (ma) => refineOrDieWith_(ma, pf, f);
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, E, A, E1>(
  ma: Managed<R, E, A>,
  pf: (e: E) => O.Option<E1>
): Managed<R, E1, A> {
  return refineOrDieWith_(ma, pf, identity);
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie<E, E1>(
  pf: (e: E) => O.Option<E1>
): <R, A>(ma: Managed<R, E, A>) => Managed<R, E1, A> {
  return (ma) => refineOrDie_(ma, pf);
}

import type { IO } from "../core";
import type { Option } from "@principia/base/data/Option";

import * as O from "@principia/base/data/Option";

import { catchAll_, die, fail } from "../core";

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, E, A, E1>(
  fa: IO<R, E, A>,
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown
): IO<R, E1, A> {
  return catchAll_(fa, (e) => O.fold_(pf(e), () => die(f(e)), fail));
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown
): <R, A>(fa: IO<R, E, A>) => IO<R, E1, A> {
  return (fa) => refineOrDieWith_(fa, pf, f);
}

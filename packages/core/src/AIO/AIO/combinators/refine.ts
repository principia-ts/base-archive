import { identity } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import { catchAll_, die, fail } from "../_core";
import type { AIO } from "../model";

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie_<R, E, A, E1>(
  fa: AIO<R, E, A>,
  pf: (e: E) => Option<E1>
): AIO<R, E1, A> {
  return refineOrDieWith_(fa, pf, identity);
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest
 */
export function refineOrDie<E, E1>(
  pf: (e: E) => Option<E1>
): <R, A>(fa: AIO<R, E, A>) => AIO<R, E1, A> {
  return (fa) => refineOrDie_(fa, pf);
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith_<R, E, A, E1>(
  fa: AIO<R, E, A>,
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown
): AIO<R, E1, A> {
  return catchAll_(fa, (e) => O.fold_(pf(e), () => die(f(e)), fail));
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown
): <R, A>(fa: AIO<R, E, A>) => AIO<R, E1, A> {
  return (fa) => refineOrDieWith_(fa, pf, f);
}

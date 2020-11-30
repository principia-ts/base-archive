import { fail, foldCauseM, pure } from "../_core";
import type { Cause } from "../Cause";
import * as C from "../Cause";
import type { IO } from "../model";
import { mapErrorCause } from "./mapErrorCause";

/**
 * ```haskell
 * sandbox :: IO r e a -> IO r (Cause e) a
 * ```
 *
 * Exposes the full cause of failure of this effect.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const sandbox: <R, E, A>(fa: IO<R, E, A>) => IO<R, Cause<E>, A> = foldCauseM(fail, pure);

/**
 * ```haskell
 * unsandbox :: IO r (Cause e) a -> IO r e a
 * ```
 *
 * The inverse operation `sandbox`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const unsandbox: <R, E, A>(ef: IO<R, Cause<E>, A>) => IO<R, E, A> = mapErrorCause(C.flatten);

export function sandboxWith<R, E, A, E1>(
  f: (_: IO<R, Cause<E>, A>) => IO<R, Cause<E1>, A>
): (ef: IO<R, E, A>) => IO<R, E1, A> {
  return (ef) => unsandbox(f(sandbox(ef)));
}

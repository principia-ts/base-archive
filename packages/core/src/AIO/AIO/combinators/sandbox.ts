import type { Cause } from "../../Exit/Cause";
import * as C from "../../Exit/Cause";
import { fail, foldCauseM, pure } from "../_core";
import type { AIO } from "../model";
import { mapErrorCause } from "./mapErrorCause";

/**
 * ```haskell
 * sandbox :: AIO r e a -> AIO r (Cause e) a
 * ```
 *
 * Exposes the full cause of failure of this effect.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const sandbox: <R, E, A>(fa: AIO<R, E, A>) => AIO<R, Cause<E>, A> = foldCauseM(fail, pure);

/**
 * ```haskell
 * unsandbox :: AIO r (Cause e) a -> AIO r e a
 * ```
 *
 * The inverse operation `sandbox`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const unsandbox: <R, E, A>(ef: AIO<R, Cause<E>, A>) => AIO<R, E, A> = mapErrorCause(
  C.flatten
);

export function sandboxWith<R, E, A, E1>(
  f: (_: AIO<R, Cause<E>, A>) => AIO<R, Cause<E1>, A>
): (ef: AIO<R, E, A>) => AIO<R, E1, A> {
  return (ef) => unsandbox(f(sandbox(ef)));
}

import type { Cause } from "../../Cause";
import * as C from "../../Cause";
import { fail, foldCauseM, pure } from "../core";
import type { Effect } from "../Effect";
import { mapErrorCause } from "./mapErrorCause";

/**
 * ```haskell
 * sandbox :: Effect r e a -> Effect r (Cause e) a
 * ```
 *
 * Exposes the full cause of failure of this effect.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const sandbox: <R, E, A>(fa: Effect<R, E, A>) => Effect<R, Cause<E>, A> = foldCauseM(fail, pure);

/**
 * ```haskell
 * unsandbox :: Effect r (Cause e) a -> Effect r e a
 * ```
 *
 * The inverse operation `sandbox`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const unsandbox: <R, E, A>(ef: Effect<R, Cause<E>, A>) => Effect<R, E, A> = mapErrorCause(C.flatten);

export const sandboxWith = <R, E, A, E1>(f: (_: Effect<R, Cause<E>, A>) => Effect<R, Cause<E1>, A>) => (
   ef: Effect<R, E, A>
) => unsandbox(f(sandbox(ef)));

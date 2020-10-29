import { fail, foldCauseM, pure } from "../_core";
import type { Cause } from "../../Exit/Cause";
import * as C from "../../Exit/Cause";
import type { Task } from "../model";
import { mapErrorCause } from "./mapErrorCause";

/**
 * ```haskell
 * sandbox :: Task r e a -> Task r (Cause e) a
 * ```
 *
 * Exposes the full cause of failure of this effect.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const sandbox: <R, E, A>(fa: Task<R, E, A>) => Task<R, Cause<E>, A> = foldCauseM(fail, pure);

/**
 * ```haskell
 * unsandbox :: Task r (Cause e) a -> Task r e a
 * ```
 *
 * The inverse operation `sandbox`
 *
 * @category Combinators
 * @since 1.0.0
 */
export const unsandbox: <R, E, A>(ef: Task<R, Cause<E>, A>) => Task<R, E, A> = mapErrorCause(C.flatten);

export const sandboxWith = <R, E, A, E1>(f: (_: Task<R, Cause<E>, A>) => Task<R, Cause<E1>, A>) => (
   ef: Task<R, E, A>
) => unsandbox(f(sandbox(ef)));

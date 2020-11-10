import { map_ } from "../_core";
import { some } from "../../../Option";
import type { Task } from "../model";

/**
 * ```haskell
 * asSome :: Task r e a -> Task r e (Option a)
 * ```
 *
 * Maps the success value of this effect to an optional value.
 */
export const asSome = <R, E, A>(ef: Task<R, E, A>) => map_(ef, some);

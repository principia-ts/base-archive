import { some } from "../../../Option";
import { map_ } from "../core";
import type { Task } from "../model";

/**
 * ```haskell
 * asSome :: Task r e a -> Task r e (Maybe a)
 * ```
 *
 * Maps the success value of this effect to an optional value.
 */
export const asSome = <R, E, A>(ef: Task<R, E, A>) => map_(ef, some);

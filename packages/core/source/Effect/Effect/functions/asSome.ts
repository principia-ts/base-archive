import { some } from "../../../Option";
import { map_ } from "../core";
import type { Effect } from "../model";

/**
 * ```haskell
 * asSome :: Effect r e a -> Effect r e (Maybe a)
 * ```
 *
 * Maps the success value of this effect to an optional value.
 */
export const asSome = <R, E, A>(ef: Effect<R, E, A>) => map_(ef, some);

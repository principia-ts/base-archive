import { map_ } from "../_core";
import type { Option } from "../../../Option";
import { some } from "../../../Option";
import type { Task } from "../model";

/**
 * ```haskell
 * asSome :: Task r e a -> Task r e (Option a)
 * ```
 *
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(ef: Task<R, E, A>): Task<R, E, Option<A>> {
   return map_(ef, some);
}

import type { Option } from "../../../Option";
import { some } from "../../../Option";
import { map_ } from "../_core";
import type { AIO } from "../model";

/**
 * ```haskell
 * asSome :: AIO r e a -> AIO r e (Option a)
 * ```
 *
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(ef: AIO<R, E, A>): AIO<R, E, Option<A>> {
  return map_(ef, some);
}

import type { Option } from "../../Option";
import { some } from "../../Option";
import { map_ } from "../_core";
import type { IO } from "../model";

/**
 * ```haskell
 * asSome :: IO r e a -> IO r e (Option a)
 * ```
 *
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(ef: IO<R, E, A>): IO<R, E, Option<A>> {
  return map_(ef, some);
}

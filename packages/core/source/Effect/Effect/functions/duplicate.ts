import { identity } from "../../../Function";
import type { Effect } from "../model";
import { extend_ } from "./extend";

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w w a
 * ```
 */
export const duplicate = <R, E, A>(wa: Effect<R, E, A>): Effect<R, E, Effect<R, E, A>> => extend_(wa, identity);

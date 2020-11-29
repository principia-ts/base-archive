import { identity } from "../../../Function";
import type { AIO } from "../model";
import { extend_ } from "./extend";

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w w a
 * ```
 */
export function duplicate<R, E, A>(wa: AIO<R, E, A>): AIO<R, E, AIO<R, E, A>> {
  return extend_(wa, identity);
}

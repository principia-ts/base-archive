import { identity } from "../../../Function";
import type { Task } from "../model";
import { extend_ } from "./extend";

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w w a
 * ```
 */
export function duplicate<R, E, A>(wa: Task<R, E, A>): Task<R, E, Task<R, E, A>> {
   return extend_(wa, identity);
}

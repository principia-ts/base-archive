import { zip_ } from "../applicative-seq";
import type { Managed } from "../model";
import { ask } from "../reader";

/**
 * Zips this Managed with its environment
 */
export function zipEnv<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, readonly [A, R]> {
  return zip_(ma, ask<R>());
}

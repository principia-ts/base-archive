import { zip_ } from "../applicative-seq";
import type { AIO } from "../model";
import { ask } from "../reader";

/**
 * Zips this Managed with its environment
 */
export function zipEnv<R, E, A>(ma: AIO<R, E, A>): AIO<R, E, readonly [A, R]> {
  return zip_(ma, ask<R>());
}

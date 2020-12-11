import { zip_ } from "../applicative-seq";
import type { IO } from "../model";
import { ask } from "../reader";

/**
 * Zips the success of this IO with its environment
 */
export function zipEnv<R, E, A>(ma: IO<R, E, A>): IO<R, E, readonly [A, R]> {
  return zip_(ma, ask<R>());
}

import { both_ } from "../applicative-seq";
import type { Task } from "../model";
import { ask } from "../reader";

/**
 * Zips this Managed with its environment
 */
export function zipEnv<R, E, A>(ma: Task<R, E, A>): Task<R, E, readonly [A, R]> {
  return both_(ma, ask<R>());
}

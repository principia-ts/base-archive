import type { Managed } from "../core";

import { ask, product_ } from "../core";

/**
 * Zips this Managed with its environment
 */
export function zipEnv<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, readonly [A, R]> {
  return product_(ma, ask<R>());
}

import { both_ } from "../applicative-seq";
import type { Managed } from "../model";
import { ask } from "../reader";

/**
 * Zips this Managed with its environment
 */
export const zipEnv = <R, E, A>(ma: Managed<R, E, A>): Managed<R, E, readonly [A, R]> => both_(ma, ask<R>());

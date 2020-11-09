import { both_ } from "../applicative-seq";
import type { Task } from "../model";
import { ask } from "../reader";

/**
 * Zips this Managed with its environment
 */
export const zipEnv = <R, E, A>(ma: Task<R, E, A>): Task<R, E, readonly [A, R]> => both_(ma, ask<R>());

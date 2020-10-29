import { chain_ } from "../_core";
import type { Task } from "../model";

/**
 * Repeats this effect forever (until the first failure).
 */
export const forever = <R, E, A>(fa: Task<R, E, A>): Task<R, E, A> => chain_(fa, () => forever(fa));

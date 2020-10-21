import { chain_ } from "../core";
import type { Effect } from "../model";

/**
 * Repeats this effect forever (until the first failure).
 */
export const forever = <R, E, A>(fa: Effect<R, E, A>): Effect<R, E, A> => chain_(fa, () => forever(fa));

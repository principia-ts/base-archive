import { chain_ } from "../_core";
import type { Task } from "../model";

/**
 * Repeats this effect forever (until the first failure).
 */
export function forever<R, E, A>(fa: Task<R, E, A>): Task<R, E, A> {
  return chain_(fa, () => forever(fa));
}

import { chain_ } from "../_core";
import type { IO } from "../model";

/**
 * Repeats this effect forever (until the first failure).
 */
export function forever<R, E, A>(fa: IO<R, E, A>): IO<R, E, A> {
  return chain_(fa, () => forever(fa));
}

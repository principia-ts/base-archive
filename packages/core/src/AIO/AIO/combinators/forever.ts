import { chain_ } from "../_core";
import type { AIO } from "../model";

/**
 * Repeats this effect forever (until the first failure).
 */
export function forever<R, E, A>(fa: AIO<R, E, A>): AIO<R, E, A> {
  return chain_(fa, () => forever(fa));
}

import type { Managed } from "../core";

import { foldM_, succeed } from "../core";

/**
 * Returns a new Managed where the error channel has been merged into the
 * success channel to their common combined type.
 */
export function merge<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, E | A> {
  return foldM_(ma, succeed, succeed);
}

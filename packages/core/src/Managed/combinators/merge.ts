import { succeed } from "../constructors";
import { foldM_ } from "../fold";
import type { Managed } from "../model";

/**
 * Returns a new Managed where the error channel has been merged into the
 * success channel to their common combined type.
 */
export function merge<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, E | A> {
  return foldM_(ma, succeed, succeed);
}

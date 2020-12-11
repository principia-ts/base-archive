import type { URIO } from "../_core";
import { asks } from "../_core";

/**
 * Creates a `IO` from a non-throwing function
 */
export function fromFunction<R, A>(f: (r: R) => A): URIO<R, A> {
  return asks(f);
}

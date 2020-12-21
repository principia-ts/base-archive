import type { FIO, IO } from "../core";

import { asksM } from "../core";

/**
 * Creates a `IO` from an IO-returning function
 */
export function fromFunctionM<R, E, A>(f: (r: R) => FIO<E, A>): IO<R, E, A> {
  return asksM(f);
}

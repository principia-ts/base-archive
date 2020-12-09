import type { FIO, IO } from "../model";
import { asksM } from "../reader";

/**
 * Creates a `IO` from an IO-returning function
 */
export function fromFunctionM<R, E, A>(f: (r: R) => FIO<E, A>): IO<R, E, A> {
  return asksM(f);
}

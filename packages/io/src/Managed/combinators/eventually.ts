import * as I from "../_internal/io";
import { Managed } from "../core";

export function eventually<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
  return new Managed(I.eventually(ma.io));
}

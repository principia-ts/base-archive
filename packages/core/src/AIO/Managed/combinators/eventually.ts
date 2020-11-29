import * as T from "../_internal/aio";
import { Managed } from "../model";

export function eventually<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, A> {
  return new Managed(T.eventually(ma.aio));
}

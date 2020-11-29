import { Managed } from "../_core";
import * as T from "../_internal/aio";

export function suspend<R, E, A>(thunk: () => Managed<R, E, A>): Managed<R, E, A> {
  return new Managed(T.suspend(() => thunk().aio));
}

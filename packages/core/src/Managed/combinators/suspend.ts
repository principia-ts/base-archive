import { Managed } from "../_core";
import * as I from "../_internal/io";

export function suspend<R, E, A>(thunk: () => Managed<R, E, A>): Managed<R, E, A> {
  return new Managed(I.suspend(() => thunk().io));
}

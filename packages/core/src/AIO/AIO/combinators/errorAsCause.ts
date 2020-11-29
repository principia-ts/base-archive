import type { Cause } from "../../Exit/Cause/model";
import { foldM_, halt, pure } from "../_core";
import type { AIO } from "../model";

export function errorAsCause<R, E, A>(fa: AIO<R, Cause<E>, A>): AIO<R, E, A> {
  return foldM_(fa, halt, pure);
}

import { foldM_, halt, pure } from "../_core";
import type { Cause } from "../Cause/model";
import type { IO } from "../model";

export function errorAsCause<R, E, A>(fa: IO<R, Cause<E>, A>): IO<R, E, A> {
  return foldM_(fa, halt, pure);
}

import { fail, foldCauseM_, pure } from "../_core";
import type { Cause } from "../Cause";
import type { IO } from "../model";

export function causeAsError<R, E, A>(fa: IO<R, E, A>): IO<R, Cause<E>, A> {
  return foldCauseM_(fa, fail, pure);
}

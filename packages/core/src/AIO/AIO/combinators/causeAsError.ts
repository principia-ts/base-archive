import type { Cause } from "../../Exit/Cause";
import { fail, foldCauseM_, pure } from "../_core";
import type { AIO } from "../model";

export function causeAsError<R, E, A>(fa: AIO<R, E, A>): AIO<R, Cause<E>, A> {
  return foldCauseM_(fa, fail, pure);
}

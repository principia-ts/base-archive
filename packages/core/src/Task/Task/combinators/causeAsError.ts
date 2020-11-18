import { fail, foldCauseM_, pure } from "../_core";
import type { Cause } from "../../Exit/Cause";
import type { Task } from "../model";

export function causeAsError<R, E, A>(fa: Task<R, E, A>): Task<R, Cause<E>, A> {
  return foldCauseM_(fa, fail, pure);
}

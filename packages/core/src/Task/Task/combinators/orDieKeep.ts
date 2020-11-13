import { foldCauseM_, halt, pure } from "../_core";
import * as C from "../../Exit/Cause";
import type { Task } from "../model";

export function orDieKeep<R, E, A>(ma: Task<R, E, A>): Task<R, unknown, A> {
   return foldCauseM_(ma, (ce) => halt(C.chain_(ce, (e) => C.die(e))), pure);
}

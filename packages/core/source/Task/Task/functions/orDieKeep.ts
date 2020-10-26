import * as C from "../../Exit/Cause";
import { foldCauseM_, halt, pure } from "../core";
import type { Task } from "../model";

export const orDieKeep = <R, E, A>(ma: Task<R, E, A>): Task<R, unknown, A> =>
   foldCauseM_(ma, (ce) => halt(C.chain_(ce, (e) => C.die(e))), pure);

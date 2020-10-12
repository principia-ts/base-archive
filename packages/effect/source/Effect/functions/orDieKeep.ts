import * as C from "../../Cause";
import { foldCauseM_, halt, pure } from "../core";
import type { Effect } from "../Effect";

export const orDieKeep = <R, E, A>(ma: Effect<R, E, A>): Effect<R, unknown, A> =>
   foldCauseM_(ma, (ce) => halt(C.chain_(ce, (e) => C.die(e))), pure);

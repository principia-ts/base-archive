import * as C from "../../Exit/Cause";
import { foldCauseM_, halt, pure } from "../_core";
import type { AIO } from "../model";

export function orDieKeep<R, E, A>(ma: AIO<R, E, A>): AIO<R, unknown, A> {
  return foldCauseM_(ma, (ce) => halt(C.chain_(ce, (e) => C.die(e))), pure);
}

import { foldCauseM_, halt, pure } from "../_core";
import * as C from "../Cause";
import type { IO } from "../model";

export function orDieKeep<R, E, A>(ma: IO<R, E, A>): IO<R, unknown, A> {
  return foldCauseM_(ma, (ce) => halt(C.chain_(ce, (e) => C.die(e))), pure);
}

import type { IO } from "../core";

import * as C from "../../Cause/core";
import { foldCauseM_, halt, pure } from "../core";

export function orDieKeep<R, E, A>(ma: IO<R, E, A>): IO<R, unknown, A> {
  return foldCauseM_(ma, (ce) => halt(C.flatMap_(ce, (e) => C.die(e))), pure);
}

import * as O from "../../../Option";
import * as C from "../../Exit/Cause";
import { halt } from "../_core";
import type { AIO } from "../model";
import { FoldInstruction } from "../model";

export function tryOrElse_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: AIO<R, E, A>,
  that: () => AIO<R1, E1, A1>,
  onSuccess: (a: A) => AIO<R2, E2, A2>
): AIO<R & R1 & R2, E1 | E2, A1 | A2> {
  return new FoldInstruction(ma, (cause) => O.fold_(C.keepDefects(cause), that, halt), onSuccess);
}

export function tryOrElse<A, R1, E1, A1, R2, E2, A2>(
  that: () => AIO<R1, E1, A1>,
  onSuccess: (a: A) => AIO<R2, E2, A2>
): <R, E>(ma: AIO<R, E, A>) => AIO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => tryOrElse_(ma, that, onSuccess);
}

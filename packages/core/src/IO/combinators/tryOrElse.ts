import * as O from "../../Option";
import { halt } from "../_core";
import * as C from "../Cause";
import type { IO } from "../model";
import { FoldInstruction } from "../model";

export function tryOrElse_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: IO<R, E, A>,
  that: () => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return new FoldInstruction(ma, (cause) => O.fold_(C.keepDefects(cause), that, halt), onSuccess);
}

export function tryOrElse<A, R1, E1, A1, R2, E2, A2>(
  that: () => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): <R, E>(ma: IO<R, E, A>) => IO<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => tryOrElse_(ma, that, onSuccess);
}

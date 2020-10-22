import * as O from "../../../Option";
import * as C from "../../Cause";
import { halt } from "../core";
import type { Effect } from "../model";
import { FoldInstruction } from "../model";

export const tryOrElse_ = <R, E, A, R1, E1, A1, R2, E2, A2>(
   ma: Effect<R, E, A>,
   that: () => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
): Effect<R & R1 & R2, E1 | E2, A1 | A2> =>
   new FoldInstruction(ma, (cause) => O.fold_(C.keepDefects(cause), that, halt), onSuccess);

export const tryOrElse = <A, R1, E1, A1, R2, E2, A2>(
   that: () => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
) => <R, E>(ma: Effect<R, E, A>): Effect<R & R1 & R2, E1 | E2, A1 | A2> => tryOrElse_(ma, that, onSuccess);

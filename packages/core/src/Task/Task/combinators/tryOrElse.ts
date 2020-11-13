import { halt } from "../_core";
import * as O from "../../../Option";
import * as C from "../../Exit/Cause";
import type { Task } from "../model";
import { FoldInstruction } from "../model";

export function tryOrElse_<R, E, A, R1, E1, A1, R2, E2, A2>(
   ma: Task<R, E, A>,
   that: () => Task<R1, E1, A1>,
   onSuccess: (a: A) => Task<R2, E2, A2>
): Task<R & R1 & R2, E1 | E2, A1 | A2> {
   return new FoldInstruction(ma, (cause) => O.fold_(C.keepDefects(cause), that, halt), onSuccess);
}

export function tryOrElse<A, R1, E1, A1, R2, E2, A2>(
   that: () => Task<R1, E1, A1>,
   onSuccess: (a: A) => Task<R2, E2, A2>
): <R, E>(ma: Task<R, E, A>) => Task<R & R1 & R2, E1 | E2, A1 | A2> {
   return (ma) => tryOrElse_(ma, that, onSuccess);
}

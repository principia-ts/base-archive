import type { Cause } from "../Task/Exit/Cause";
import { FoldInstruction } from "./internal/Concrete";
import type { Async } from "./model";

export const foldCauseM_ = <R, E, A, R1, E1, A1, R2, E2, A2>(
   task: Async<R, E, A>,
   onFailure: (cause: Cause<E>) => Async<R1, E1, A1>,
   onSuccess: (a: A) => Async<R2, E2, A2>
): Async<R & R1 & R2, E1 | E2, A1 | A2> => new FoldInstruction(task, onFailure, onSuccess);

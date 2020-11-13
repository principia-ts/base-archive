import { chain } from "../_core";
import type { Task } from "../model";
import { swapWith_ } from "./swapWith";

export function chainError_<R, R1, E, E1, A>(ef: Task<R, E, A>, f: (e: E) => Task<R1, never, E1>): Task<R & R1, E1, A> {
   return swapWith_(ef, chain(f));
}

export function chainError<E, R1, E1>(
   f: (e: E) => Task<R1, never, E1>
): <R, A>(ef: Task<R, E, A>) => Task<R & R1, E1, A> {
   return (ef) => chainError_(ef, f);
}

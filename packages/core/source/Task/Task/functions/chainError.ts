import { chain } from "../core";
import type { Task } from "../model";
import { swapWith_ } from "./swapWith";

export const chainError_ = <R, R1, E, E1, A>(ef: Task<R, E, A>, f: (e: E) => Task<R1, never, E1>) =>
   swapWith_(ef, chain(f));

export const chainError = <E, R1, E1>(f: (e: E) => Task<R1, never, E1>) => <R, A>(ef: Task<R, E, A>) =>
   chainError_(ef, f);

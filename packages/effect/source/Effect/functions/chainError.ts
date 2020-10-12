import { chain } from "../core";
import type { Effect } from "../Effect";
import { swapWith_ } from "./swapWith";

export const chainError_ = <R, R1, E, E1, A>(ef: Effect<R, E, A>, f: (e: E) => Effect<R1, never, E1>) =>
   swapWith_(ef, chain(f));

export const chainError = <E, R1, E1>(f: (e: E) => Effect<R1, never, E1>) => <R, A>(ef: Effect<R, E, A>) =>
   chainError_(ef, f);

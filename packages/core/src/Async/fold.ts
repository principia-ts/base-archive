import { flow } from "../Function";
import { succeed } from "./constructors";
import type { Async } from "./model";
import { FoldInstruction } from "./model";

/*
 * -------------------------------------------
 * Async Folds
 * -------------------------------------------
 */

export const foldM_ = <R, E, A, R1, E1, A1, R2, E2, A2>(
   async: Async<R, E, A>,
   f: (e: E) => Async<R1, E1, A1>,
   g: (a: A) => Async<R2, E2, A2>
): Async<R & R1 & R2, E1 | E2, A1 | A2> => new FoldInstruction(async, f, g);

export const foldM = <E, A, R1, E1, A1, R2, E2, A2>(f: (e: E) => Async<R1, E1, A1>, g: (a: A) => Async<R2, E2, A2>) => <
   R
>(
   async: Async<R, E, A>
): Async<R & R1 & R2, E1 | E2, A1 | A2> => foldM_(async, f, g);

export const fold_ = <R, E, A, B, C>(async: Async<R, E, A>, f: (e: E) => B, g: (a: A) => C): Async<R, never, B | C> =>
   foldM_(async, flow(f, succeed), flow(g, succeed));

export const fold = <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => <R>(
   async: Async<R, E, A>
): Async<R, never, B | C> => fold_(async, f, g);

export const catchAll_ = <R, E, A, R1, E1, A1>(
   async: Async<R, E, A>,
   f: (e: E) => Async<R1, E1, A1>
): Async<R & R1, E1, A | A1> => foldM_(async, f, succeed);

export const catchAll = <E, R1, E1, A1>(f: (e: E) => Async<R1, E1, A1>) => <R, A>(
   async: Async<R, E, A>
): Async<R & R1, E1, A | A1> => catchAll_(async, f);

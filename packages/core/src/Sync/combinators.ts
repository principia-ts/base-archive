import * as X from "../XPure";
import type { Sync } from "./model";

/*
 * -------------------------------------------
 * Sync Combinators
 * -------------------------------------------
 */

export const foldM_: <R, E, A, R1, E1, B, R2, E2, C>(
   fa: Sync<R, E, A>,
   onFailure: (e: E) => Sync<R1, E1, B>,
   onSuccess: (a: A) => Sync<R2, E2, C>
) => Sync<R & R1 & R2, E1 | E2, B | C> = X.foldM_;

export const foldM: <E, A, R1, E1, B, R2, E2, C>(
   onFailure: (e: E) => Sync<R1, E1, B>,
   onSuccess: (a: A) => Sync<R2, E2, C>
) => <R>(fa: Sync<R, E, A>) => Sync<R & R1 & R2, E1 | E2, B | C> = X.foldM;

export const fold_: <R, E, A, B, C>(
   fa: Sync<R, E, A>,
   onFailure: (e: E) => B,
   onSuccess: (a: A) => C
) => Sync<R, never, B | C> = X.fold_;

export const fold: <E, A, B, C>(
   onFailure: (e: E) => B,
   onSuccess: (a: A) => C
) => <R>(fa: Sync<R, E, A>) => Sync<R, never, B | C> = X.fold;

export const catchAll_: <R, E, A, Q, D, B>(
   fa: Sync<R, E, A>,
   onFailure: (e: E) => Sync<Q, D, B>
) => Sync<Q & R, D, A | B> = X.catchAll_;

export const catchAll: <E, Q, D, B>(
   onFailure: (e: E) => Sync<Q, D, B>
) => <R, A>(fa: Sync<R, E, A>) => Sync<Q & R, D, A | B> = X.catchAll;

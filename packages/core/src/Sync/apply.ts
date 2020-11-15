import * as X from "../XPure";
import type { Sync } from "./model";

/*
 * -------------------------------------------
 * Apply Sync
 * -------------------------------------------
 */

export const mapBoth_: <R, E, A, Q, D, B, C>(
   fa: Sync<R, E, A>,
   fb: Sync<Q, D, B>,
   f: (a: A, b: B) => C
) => Sync<Q & R, D | E, C> = X.mapBoth_;

export const mapBoth: <A, Q, D, B, C>(
   fb: Sync<Q, D, B>,
   f: (a: A, b: B) => C
) => <R, E>(fa: Sync<R, E, A>) => Sync<Q & R, D | E, C> = X.mapBoth;

export const ap_: <R, E, A, Q, D, B>(fab: Sync<R, E, (a: A) => B>, fa: Sync<Q, D, A>) => Sync<Q & R, D | E, B> = X.ap_;

import * as X from "../XPure";
import type { Sync } from "./model";

/*
 * -------------------------------------------
 * Functor Sync
 * -------------------------------------------
 */

export const map_: <R, E, A, B>(fa: Sync<R, E, A>, f: (a: A) => B) => Sync<R, E, B> = X.map_;

export const map: <A, B>(f: (a: A) => B) => <R, E>(fa: Sync<R, E, A>) => Sync<R, E, B> = X.map;

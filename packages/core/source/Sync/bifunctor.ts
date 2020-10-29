import * as X from "../XPure";
import type { Sync } from "./model";

/*
 * -------------------------------------------
 * Bifunctor Sync
 * -------------------------------------------
 */

export const bimap_: <R, E, A, B, C>(pab: Sync<R, E, A>, f: (e: E) => B, g: (a: A) => C) => Sync<R, B, C> = X.bimap_;

export const bimap: <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => <R>(pab: Sync<R, E, A>) => Sync<R, B, C> = X.bimap;

export const first_: <R, E, A, B>(pab: Sync<R, E, A>, f: (e: E) => B) => Sync<R, B, A> = X.first_;

export const first: <E, B>(f: (e: E) => B) => <R, A>(pab: Sync<R, E, A>) => Sync<R, B, A> = X.first;

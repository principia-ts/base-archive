import { flow } from "../Function";
import { fail, succeed } from "./constructors";
import { foldM_ } from "./fold";
import type { Async } from "./model";

/*
 * -------------------------------------------
 * Bifunctor Async
 * -------------------------------------------
 */

export const first_ = <R, E, A, B>(pab: Async<R, E, A>, f: (e: E) => B): Async<R, B, A> =>
   foldM_(pab, flow(f, fail), succeed);

export const first = <E, B>(f: (e: E) => B) => <R, A>(pab: Async<R, E, A>): Async<R, B, A> => first_(pab, f);

export const bimap_ = <R, E, A, B, C>(pab: Async<R, E, A>, f: (e: E) => B, g: (a: A) => C): Async<R, B, C> =>
   foldM_(pab, flow(f, fail), flow(g, succeed));

export const bimap = <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => <R>(pab: Async<R, E, A>): Async<R, B, C> =>
   bimap_(pab, f, g);

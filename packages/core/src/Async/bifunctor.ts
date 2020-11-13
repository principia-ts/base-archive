import { flow } from "../Function";
import { fail, succeed } from "./constructors";
import { foldM_ } from "./fold";
import type { Async } from "./model";

/*
 * -------------------------------------------
 * Bifunctor Async
 * -------------------------------------------
 */

export function mapError_<R, E, A, B>(pab: Async<R, E, A>, f: (e: E) => B): Async<R, B, A> {
   return foldM_(pab, flow(f, fail), succeed);
}

export function mapError<E, B>(f: (e: E) => B): <R, A>(pab: Async<R, E, A>) => Async<R, B, A> {
   return (pab) => mapError_(pab, f);
}

export function bimap_<R, E, A, B, C>(pab: Async<R, E, A>, f: (e: E) => B, g: (a: A) => C): Async<R, B, C> {
   return foldM_(pab, flow(f, fail), flow(g, succeed));
}

export function bimap<E, A, B, C>(f: (e: E) => B, g: (a: A) => C): <R>(pab: Async<R, E, A>) => Async<R, B, C> {
   return (pab) => bimap_(pab, f, g);
}

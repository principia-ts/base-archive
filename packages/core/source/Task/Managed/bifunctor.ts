import * as T from "./_internal/task";
import { Managed } from "./model";

/*
 * -------------------------------------------
 * Bifunctor Managed
 * -------------------------------------------
 */

export const bimap_ = <R, E, A, B, C>(pab: Managed<R, E, A>, f: (e: E) => B, g: (a: A) => C): Managed<R, B, C> =>
   new Managed(T.bimap_(pab.task, f, ([fin, a]) => [fin, g(a)]));

export const bimap = <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => <R>(pab: Managed<R, E, A>): Managed<R, B, C> =>
   bimap_(pab, f, g);

export const first_ = <R, E, A, D>(pab: Managed<R, E, A>, f: (e: E) => D): Managed<R, D, A> =>
   new Managed(T.first_(pab.task, f));

export const first = <E, D>(f: (e: E) => D) => <R, A>(pab: Managed<R, E, A>): Managed<R, D, A> => first_(pab, f);

export const mapError_ = first_;

export const mapError = first;

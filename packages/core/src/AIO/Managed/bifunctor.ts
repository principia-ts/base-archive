import * as T from "./_internal/aio";
import { Managed } from "./model";

/*
 * -------------------------------------------
 * Bifunctor Managed
 * -------------------------------------------
 */

export function bimap_<R, E, A, B, C>(
  pab: Managed<R, E, A>,
  f: (e: E) => B,
  g: (a: A) => C
): Managed<R, B, C> {
  return new Managed(T.bimap_(pab.aio, f, ([fin, a]) => [fin, g(a)]));
}

export function bimap<E, A, B, C>(
  f: (e: E) => B,
  g: (a: A) => C
): <R>(pab: Managed<R, E, A>) => Managed<R, B, C> {
  return (pab) => bimap_(pab, f, g);
}

export function mapError_<R, E, A, D>(pab: Managed<R, E, A>, f: (e: E) => D): Managed<R, D, A> {
  return new Managed(T.mapError_(pab.aio, f));
}

export function mapError<E, D>(f: (e: E) => D): <R, A>(pab: Managed<R, E, A>) => Managed<R, D, A> {
  return (pab) => mapError_(pab, f);
}

import type { Reader } from "./model";

/*
 * -------------------------------------------
 * Profunctor Reader
 * -------------------------------------------
 */

export function promap_<R, A, Q, B>(
  pa: Reader<R, A>,
  f: (q: Q) => R,
  g: (a: A) => B
): Reader<Q, B> {
  return (q) => g(pa(f(q)));
}

export function promap<R, A, Q, B>(
  f: (q: Q) => R,
  g: (a: A) => B
): (pa: Reader<R, A>) => Reader<Q, B> {
  return (pa) => promap_(pa, f, g);
}

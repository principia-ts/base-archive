import type { Managed } from '../core'

import * as A from '@principia/base/data/Array'

import { chain_, succeed } from '../core'

/**
 * Folds an Iterable<A> using an effectual function f, working sequentially from left to right.
 */
export function foldl_<R, E, A, B>(as: Iterable<A>, b: B, f: (b: B, a: A) => Managed<R, E, B>): Managed<R, E, B> {
  return A.foldLeft_(Array.from(as), succeed(b) as Managed<R, E, B>, (acc, v) => chain_(acc, (a) => f(a, v)))
}

/**
 * Folds an Iterable<A> using an effectual function f, working sequentially from left to right.
 */
export function foldl<R, E, A, B>(b: B, f: (b: B, a: A) => Managed<R, E, B>): (as: Iterable<A>) => Managed<R, E, B> {
  return (as) => foldl_(as, b, f)
}

import * as A from "../../Array/_core";
import { succeed } from "../constructors";
import type { Managed } from "../model";
import { chain_ } from "../monad";

/**
 * Folds an Iterable<A> using an effectual function f, working sequentially from left to right.
 */
export function foldl_<R, E, A, B>(
  as: Iterable<A>,
  b: B,
  f: (b: B, a: A) => Managed<R, E, B>
): Managed<R, E, B> {
  return A.reduce_(Array.from(as), succeed(b) as Managed<R, E, B>, (acc, v) =>
    chain_(acc, (a) => f(a, v))
  );
}

/**
 * Folds an Iterable<A> using an effectual function f, working sequentially from left to right.
 */
export function foldl<R, E, A, B>(
  b: B,
  f: (b: B, a: A) => Managed<R, E, B>
): (as: Iterable<A>) => Managed<R, E, B> {
  return (as) => foldl_(as, b, f);
}

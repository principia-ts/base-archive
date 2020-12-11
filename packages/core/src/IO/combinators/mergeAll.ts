import * as I from "../../Iterable";
import { pure, zipWith_ } from "../_core";
import type { IO } from "../model";

/**
 * Merges an `Iterable<IO>` to a single IO, working sequentially.
 */
export const mergeAll_ = <R, E, A, B>(
  fas: Iterable<IO<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): IO<R, E, B> => I.reduce_(fas, pure(b) as IO<R, E, B>, (_b, a) => zipWith_(_b, a, f));

/**
 * Merges an `Iterable<IO>` to a single IO, working sequentially.
 */
export const mergeAll = <A, B>(b: B, f: (b: B, a: A) => B) => <R, E>(
  fas: Iterable<IO<R, E, A>>
): IO<R, E, B> => mergeAll_(fas, b, f);

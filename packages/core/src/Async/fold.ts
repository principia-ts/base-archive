import { flow } from "../Function";
import { succeed } from "./constructors";
import type { Async } from "./model";
import { FoldInstruction } from "./model";

/*
 * -------------------------------------------
 * Async Folds
 * -------------------------------------------
 */

export function foldM_<R, E, A, R1, E1, A1, R2, E2, A2>(
  async: Async<R, E, A>,
  f: (e: E) => Async<R1, E1, A1>,
  g: (a: A) => Async<R2, E2, A2>
): Async<R & R1 & R2, E1 | E2, A1 | A2> {
  return new FoldInstruction(async, f, g);
}

export function foldM<E, A, R1, E1, A1, R2, E2, A2>(
  f: (e: E) => Async<R1, E1, A1>,
  g: (a: A) => Async<R2, E2, A2>
): <R>(async: Async<R, E, A>) => Async<R & R1 & R2, E1 | E2, A1 | A2> {
  return (async) => foldM_(async, f, g);
}

export function fold_<R, E, A, B, C>(
  async: Async<R, E, A>,
  f: (e: E) => B,
  g: (a: A) => C
): Async<R, never, B | C> {
  return foldM_(async, flow(f, succeed), flow(g, succeed));
}

export function fold<E, A, B, C>(
  f: (e: E) => B,
  g: (a: A) => C
): <R>(async: Async<R, E, A>) => Async<R, never, B | C> {
  return (async) => fold_(async, f, g);
}

export function catchAll_<R, E, A, R1, E1, A1>(
  async: Async<R, E, A>,
  f: (e: E) => Async<R1, E1, A1>
): Async<R & R1, E1, A | A1> {
  return foldM_(async, f, succeed);
}

export function catchAll<E, R1, E1, A1>(
  f: (e: E) => Async<R1, E1, A1>
): <R, A>(async: Async<R, E, A>) => Async<R & R1, E1, A1 | A> {
  return (async) => catchAll_(async, f);
}

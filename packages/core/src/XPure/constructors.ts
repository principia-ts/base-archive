import type { XPure } from "./model";
import {
  FailInstruction,
  ModifyInstruction,
  PartialInstruction,
  SucceedInstruction,
  SuspendInstruction,
  TotalInstruction
} from "./model";

/**
 * ```haskell
 * succeed :: <a, s1, s2>a -> XPure s1 s2 _ _ a
 * ```
 */
export function succeed<A, S1 = unknown, S2 = never>(a: A): XPure<S1, S2, unknown, never, A> {
  return new SucceedInstruction(a);
}

export function total<A, S1 = unknown, S2 = never>(
  thunk: () => A
): XPure<S1, S2, unknown, never, A> {
  return new TotalInstruction(thunk);
}

export function fail<E>(e: E): XPure<unknown, never, unknown, E, never> {
  return new FailInstruction(e);
}

export function modify<S1, S2, A>(
  f: (s: S1) => readonly [S2, A]
): XPure<S1, S2, unknown, never, A> {
  return new ModifyInstruction(f);
}

export function suspend<S1, S2, R, E, A>(
  factory: () => XPure<S1, S2, R, E, A>
): XPure<S1, S2, R, E, A> {
  return new SuspendInstruction(factory);
}

export function sync<A>(thunk: () => A): XPure<unknown, never, unknown, never, A> {
  return suspend(() => succeed(thunk()));
}

export function partial_<A, E>(
  f: () => A,
  onThrow: (reason: unknown) => E
): XPure<unknown, never, unknown, E, A> {
  return new PartialInstruction(f, onThrow);
}

export function partial<E>(
  onThrow: (reason: unknown) => E
): <A>(f: () => A) => XPure<unknown, never, unknown, E, A> {
  return (f) => partial_(f, onThrow);
}

import type { Concrete } from "./_concrete";
import {
   FailInstruction,
   ModifyInstruction,
   PartialInstruction,
   PureInstruction,
   SuspendInstruction,
   TotalInstruction
} from "./_concrete";
import type { XPure } from "./model";

export const concrete = <S1, S2, R, E, A>(_: XPure<S1, S2, R, E, A>): Concrete<S1, S2, R, E, A> => _ as any;

/**
 * ```haskell
 * succeed :: <a, s1, s2>a -> XPure s1 s2 _ _ a
 * ```
 */
export const succeed = <A, S1 = unknown, S2 = never>(a: A): XPure<S1, S2, unknown, never, A> => new PureInstruction(a);

export const total = <A, S1 = unknown, S2 = never>(thunk: () => A): XPure<S1, S2, unknown, never, A> =>
   new TotalInstruction(thunk);

export const fail = <E>(e: E): XPure<unknown, never, unknown, E, never> => new FailInstruction(e);

export const modify = <S1, S2, A>(f: (s: S1) => readonly [S2, A]): XPure<S1, S2, unknown, never, A> =>
   new ModifyInstruction(f);

export const suspend = <S1, S2, R, E, A>(factory: () => XPure<S1, S2, R, E, A>): XPure<S1, S2, R, E, A> =>
   new SuspendInstruction(factory);

export const sync = <A>(thunk: () => A) => suspend(() => succeed(thunk()));

export const partial_ = <A, E>(f: () => A, onThrow: (reason: unknown) => E): XPure<unknown, never, unknown, E, A> =>
   new PartialInstruction(f, onThrow);

export const partial = <E>(onThrow: (reason: unknown) => E) => <A>(f: () => A) => partial_(f, onThrow);

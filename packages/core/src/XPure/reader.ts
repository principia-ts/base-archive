import { succeed } from "./constructors";
import type { XPure } from "./model";
import { AsksInstruction, GiveInstruction } from "./model";

export function ask<R>(): XPure<unknown, never, R, never, R> {
  return new AsksInstruction((r: R) => succeed(r));
}

export function asksM<R0, S1, S2, R, E, A>(
  f: (r: R0) => XPure<S1, S2, R, E, A>
): XPure<S1, S2, R & R0, E, A> {
  return new AsksInstruction(f);
}

export function asks<R0, A>(f: (r: R0) => A): XPure<unknown, never, R0, never, A> {
  return asksM((r: R0) => succeed(f(r)));
}

export function giveAll_<S1, S2, R, E, A>(
  fa: XPure<S1, S2, R, E, A>,
  r: R
): XPure<S1, S2, unknown, E, A> {
  return new GiveInstruction(fa, r);
}

export function giveAll<R>(
  r: R
): <S1, S2, E, A>(fa: XPure<S1, S2, R, E, A>) => XPure<S1, S2, unknown, E, A> {
  return (fa) => giveAll_(fa, r);
}

export function gives_<R0, S1, S2, R, E, A>(
  ma: XPure<S1, S2, R, E, A>,
  f: (r0: R0) => R
): XPure<S1, S2, R0, E, A> {
  return asksM((r: R0) => giveAll_(ma, f(r)));
}

export function gives<R0, R>(
  f: (r0: R0) => R
): <S1, S2, E, A>(ma: XPure<S1, S2, R, E, A>) => XPure<S1, S2, R0, E, A> {
  return (ma) => gives_(ma, f);
}

export function give_<S1, S2, R, E, A, R0>(
  ma: XPure<S1, S2, R & R0, E, A>,
  r: R
): XPure<S1, S2, R0, E, A> {
  return gives_(ma, (r0) => ({ ...r, ...r0 }));
}

export function give<R>(
  r: R
): <S1, S2, R0, E, A>(ma: XPure<S1, S2, R & R0, E, A>) => XPure<S1, S2, R0, E, A> {
  return (ma) => give_(ma, r);
}

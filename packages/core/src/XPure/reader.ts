import { succeed } from "./constructors";
import type { XPure } from "./model";
import { AsksInstruction, GiveInstruction } from "./model";

export const ask = <R>(): XPure<unknown, never, R, never, R> => new AsksInstruction((r: R) => succeed(r));

export const asksM = <R0, S1, S2, R, E, A>(f: (r: R0) => XPure<S1, S2, R, E, A>): XPure<S1, S2, R & R0, E, A> =>
   new AsksInstruction(f);

export const asks = <R0, A>(f: (r: R0) => A) => asksM((r: R0) => succeed(f(r)));

export const giveAll_ = <S1, S2, R, E, A>(fa: XPure<S1, S2, R, E, A>, r: R): XPure<S1, S2, unknown, E, A> =>
   new GiveInstruction(fa, r);

export const giveAll = <R>(r: R) => <S1, S2, E, A>(fa: XPure<S1, S2, R, E, A>) => giveAll_(fa, r);

export const gives_ = <R0, S1, S2, R, E, A>(ma: XPure<S1, S2, R, E, A>, f: (r0: R0) => R) =>
   asksM((r: R0) => giveAll_(ma, f(r)));

export const gives = <R0, R>(f: (r0: R0) => R) => <S1, S2, E, A>(ma: XPure<S1, S2, R, E, A>) => gives_(ma, f);

export const give_ = <S1, S2, R, E, A, R0>(ma: XPure<S1, S2, R & R0, E, A>, r: R): XPure<S1, S2, R0, E, A> =>
   gives_(ma, (r0) => ({ ...r, ...r0 }));

export const give = <R>(r: R) => <S1, S2, R0, E, A>(ma: XPure<S1, S2, R & R0, E, A>): XPure<S1, S2, R0, E, A> =>
   give_(ma, r);

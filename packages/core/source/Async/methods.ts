import { RSA_X931_PADDING } from "constants";

import { flow } from "../Function";
import { succeed } from "./constructors";
import { AllInstruction, ChainInstruction, GiveInstruction, ReadInstruction } from "./internal/Concrete";
import type { Async } from "./model";

export const chain_ = <R, E, A, R1, E1, B>(
   ma: Async<R, E, A>,
   f: (a: A) => Async<R1, E1, B>
): Async<R & R1, E | E1, B> => new ChainInstruction(ma, f);

export const chain = <A, R1, E1, B>(f: (a: A) => Async<R1, E1, B>) => <R, E>(
   ma: Async<R, E, A>
): Async<R & R1, E | E1, B> => chain_(ma, f);

export const map_ = <R, E, A, B>(fa: Async<R, E, A>, f: (a: A) => B): Async<R, E, B> => chain_(fa, flow(f, succeed));

export const map = <A, B>(f: (a: A) => B) => <R, E>(fa: Async<R, E, A>): Async<R, E, B> => map_(fa, f);

export const tap_ = <R, E, A, R1, E1, B>(ma: Async<R, E, A>, f: (a: A) => Async<R1, E1, B>): Async<R & R1, E | E1, A> =>
   chain_(ma, (a) => map_(f(a), () => a));

export const tap = <A, R1, E1, B>(f: (a: A) => Async<R1, E1, B>) => <R, E>(
   ma: Async<R, E, A>
): Async<R & R1, E | E1, A> => tap_(ma, f);

export const giveAll_ = <R, E, A>(ra: Async<R, E, A>, env: R): Async<unknown, E, A> => new GiveInstruction(ra, env);

export const giveAll = <R>(env: R) => <E, A>(ra: Async<R, E, A>): Async<unknown, E, A> => giveAll_(ra, env);

export const asksM = <R0, R, E, A>(f: (r0: R0) => Async<R, E, A>): Async<R0 & R, E, A> => new ReadInstruction(f);

export const collectAll = <R, E, A>(fas: ReadonlyArray<Async<R, E, A>>): Async<R, E, ReadonlyArray<A>> =>
   new AllInstruction(fas);

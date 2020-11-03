import { identity } from "../Function";
import { succeed } from "./constructors";
import type { Async } from "./model";
import { AsksInstruction, GiveInstruction } from "./model";

/*
 * -------------------------------------------
 * Reader Async
 * -------------------------------------------
 */

export const asksM = <R0, R, E, A>(f: (_: R0) => Async<R, E, A>): Async<R & R0, E, A> => new AsksInstruction(f);

export const asks = <R, A>(f: (_: R) => A): Async<R, never, A> => asksM((_: R) => succeed(f(_)));

export const ask = <R>(): Async<R, never, R> => asks(identity);

export const giveAll_ = <R, E, A>(ra: Async<R, E, A>, env: R): Async<unknown, E, A> => new GiveInstruction(ra, env);

export const giveAll = <R>(env: R) => <E, A>(ra: Async<R, E, A>): Async<unknown, E, A> => new GiveInstruction(ra, env);

export const local_ = <R0, R, E, A>(ra: Async<R, E, A>, f: (_: R0) => R): Async<R0, E, A> =>
   asksM((_: R0) => giveAll_(ra, f(_)));

export const local = <R0, R>(f: (_: R0) => R) => <E, A>(ra: Async<R, E, A>): Async<R0, E, A> => local_(ra, f);

export const give_ = <R0, R, E, A>(ra: Async<R & R0, E, A>, env: R): Async<R0, E, A> =>
   local_(ra, (r0) => ({ ...env, ...r0 }));

export const give = <R>(env: R) => <R0, E, A>(ra: Async<R & R0, E, A>): Async<R0, E, A> => give_(ra, env);

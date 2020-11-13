import { identity } from "../Function";
import { succeed } from "./constructors";
import type { Async } from "./model";
import { AsksInstruction, GiveInstruction } from "./model";

/*
 * -------------------------------------------
 * Reader Async
 * -------------------------------------------
 */

export function asksM<R0, R, E, A>(f: (_: R0) => Async<R, E, A>): Async<R & R0, E, A> {
   return new AsksInstruction(f);
}

export function asks<R, A>(f: (_: R) => A): Async<R, never, A> {
   return asksM((_: R) => succeed(f(_)));
}

export function ask<R>(): Async<R, never, R> {
   return asks(identity);
}

export function giveAll_<R, E, A>(ra: Async<R, E, A>, env: R): Async<unknown, E, A> {
   return new GiveInstruction(ra, env);
}

export function giveAll<R>(env: R): <E, A>(ra: Async<R, E, A>) => Async<unknown, E, A> {
   return (ra) => new GiveInstruction(ra, env);
}

export function gives_<R0, R, E, A>(ra: Async<R, E, A>, f: (_: R0) => R): Async<R0, E, A> {
   return asksM((_: R0) => giveAll_(ra, f(_)));
}

export function gives<R0, R>(f: (_: R0) => R): <E, A>(ra: Async<R, E, A>) => Async<R0, E, A> {
   return (ra) => gives_(ra, f);
}

export function give_<R0, R, E, A>(ra: Async<R & R0, E, A>, env: R): Async<R0, E, A> {
   return gives_(ra, (r0) => ({ ...env, ...r0 }));
}

export function give<R>(env: R): <R0, E, A>(ra: Async<R & R0, E, A>) => Async<R0, E, A> {
   return (ra) => give_(ra, env);
}

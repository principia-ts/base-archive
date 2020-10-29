import * as X from "../XPure";
import type { Sync } from "./model";

/*
 * -------------------------------------------
 * Reader Sync
 * -------------------------------------------
 */

export const ask: <R>() => Sync<R, never, R> = X.ask;

export const asksM: <R0, R, E, A>(f: (r0: R0) => Sync<R, E, A>) => Sync<R0 & R, E, A> = X.asksM;

export const asks: <R0, A>(f: (r0: R0) => A) => Sync<R0, never, A> = X.asks;

export const local_: <R0, R, E, A>(ra: Sync<R, E, A>, f: (r0: R0) => R) => Sync<R0, E, A> = X.local_;

export const local: <R0, R>(f: (r0: R0) => R) => <E, A>(ra: Sync<R, E, A>) => Sync<R0, E, A> = X.local;

export const giveAll_: <R, E, A>(ra: Sync<R, E, A>, env: R) => Sync<unknown, E, A> = X.giveAll_;

export const giveAll: <R>(env: R) => <E, A>(ra: Sync<R, E, A>) => Sync<unknown, E, A> = X.giveAll;

export const give_: <R0, R, E, A>(ra: Sync<R & R0, E, A>, env: R) => Sync<R0, E, A> = X.give_;

export const give: <R>(env: R) => <R0, E, A>(ra: Sync<R & R0, E, A>) => Sync<R0, E, A> = X.give;

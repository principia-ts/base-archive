import { die, foldM_, pure } from "../_core";
import type { Task } from "../model";

export const orDieWith_ = <R, E, A>(ma: Task<R, E, A>, f: (e: E) => unknown): Task<R, never, A> =>
   foldM_(ma, (e) => die(f(e)), pure);

export const orDieWith = <E>(f: (e: E) => unknown) => <R, A>(ma: Task<R, E, A>): Task<R, never, A> => orDieWith_(ma, f);

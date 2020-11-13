import { die, foldM_, pure } from "../_core";
import type { Task } from "../model";

export function orDieWith_<R, E, A>(ma: Task<R, E, A>, f: (e: E) => unknown): Task<R, never, A> {
   return foldM_(ma, (e) => die(f(e)), pure);
}

export function orDieWith<E>(f: (e: E) => unknown): <R, A>(ma: Task<R, E, A>) => Task<R, never, A> {
   return (ma) => orDieWith_(ma, f);
}

import { die, foldM_, pure } from "../core";
import type { Effect } from "../model";

export const orDieWith_ = <R, E, A>(ma: Effect<R, E, A>, f: (e: E) => unknown): Effect<R, never, A> =>
   foldM_(ma, (e) => die(f(e)), pure);

export const orDieWith = <E>(f: (e: E) => unknown) => <R, A>(ma: Effect<R, E, A>): Effect<R, never, A> =>
   orDieWith_(ma, f);

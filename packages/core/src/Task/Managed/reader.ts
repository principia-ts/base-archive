import * as T from "./_internal/task";
import { fromTask } from "./constructors";
import { map_, mapM_ } from "./functor";
import { Managed } from "./model";
import { chain_ } from "./monad";
import type { ReleaseMap } from "./ReleaseMap";

export function ask<R>(): Managed<R, never, R> {
   return fromTask(T.ask<R>());
}

export function asks<R, A>(f: (r: R) => A): Managed<R, never, A> {
   return map_(ask<R>(), f);
}

export function asksM<R0, R, E, A>(f: (r: R0) => T.Task<R, E, A>): Managed<R0 & R, E, A> {
   return mapM_(ask<R0>(), f);
}

export function asksManaged<R0, R, E, A>(f: (r: R0) => Managed<R, E, A>): Managed<R0 & R, E, A> {
   return chain_(ask<R0>(), f);
}

/**
 * Modify the environment required to run a Managed
 */
export function gives_<R, E, A, R0>(ma: Managed<R, E, A>, f: (r0: R0) => R): Managed<R0, E, A> {
   return new Managed(T.asksM(([r0, rm]: readonly [R0, ReleaseMap]) => T.giveAll_(ma.task, [f(r0), rm])));
}

/**
 * Modify the environment required to run a Managed
 */
export function gives<R0, R>(f: (r0: R0) => R): <E, A>(ma: Managed<R, E, A>) => Managed<R0, E, A> {
   return (ma) => gives_(ma, f);
}

export function giveAll_<R, E, A>(ma: Managed<R, E, A>, env: R): Managed<unknown, E, A> {
   return gives_(ma, () => env);
}

export function giveAll<R>(env: R): <E, A>(ma: Managed<R, E, A>) => Managed<unknown, E, A> {
   return (ma) => giveAll_(ma, env);
}

export function give_<E, A, R = unknown, R0 = unknown>(ma: Managed<R & R0, E, A>, env: R): Managed<R0, E, A> {
   return gives_(ma, (r0) => ({ ...r0, ...env }));
}

export function give<R>(env: R): <R0, E, A>(ma: Managed<R & R0, E, A>) => Managed<R0, E, A> {
   return (ma) => give_(ma, env);
}

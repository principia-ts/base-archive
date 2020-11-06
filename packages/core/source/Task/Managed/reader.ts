import * as T from "./_internal/task";
import { fromTask } from "./constructors";
import { map_, mapM_ } from "./functor";
import { Managed } from "./model";
import { chain_ } from "./monad";
import type { ReleaseMap } from "./ReleaseMap";

export const ask = <R>(): Managed<R, never, R> => fromTask(T.ask<R>());

export const asks = <R, A>(f: (r: R) => A): Managed<R, never, A> => map_(ask<R>(), f);

export const asksM = <R0, R, E, A>(f: (r: R0) => T.Task<R, E, A>): Managed<R0 & R, E, A> => mapM_(ask<R0>(), f);

export const asksManaged = <R0, R, E, A>(f: (r: R0) => Managed<R, E, A>): Managed<R0 & R, E, A> => chain_(ask<R0>(), f);

/**
 * Modify the environment required to run a Managed
 */
export const local_ = <R, E, A, R0>(ma: Managed<R, E, A>, f: (r0: R0) => R): Managed<R0, E, A> =>
   new Managed(T.asksM(([r0, rm]: readonly [R0, ReleaseMap]) => T.giveAll_(ma.task, [f(r0), rm])));

/**
 * Modify the environment required to run a Managed
 */
export const local = <R0, R>(f: (r0: R0) => R) => <E, A>(ma: Managed<R, E, A>): Managed<R0, E, A> => local_(ma, f);

export const giveAll_ = <R, E, A>(ma: Managed<R, E, A>, env: R): Managed<unknown, E, A> => local_(ma, () => env);

export const giveAll = <R>(env: R) => <E, A>(ma: Managed<R, E, A>): Managed<unknown, E, A> => giveAll_(ma, env);

export const give_ = <E, A, R = unknown, R0 = unknown>(ma: Managed<R & R0, E, A>, env: R): Managed<R0, E, A> =>
   local_(ma, (r0) => ({ ...r0, ...env }));

export const give = <R>(env: R) => <R0, E, A>(ma: Managed<R & R0, E, A>): Managed<R0, E, A> => give_(ma, env);

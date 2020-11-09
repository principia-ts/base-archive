import * as T from "../_internal/task";
import * as Ex from "../../Exit";
import { Managed } from "../model";
import { chain_ } from "../monad";
import { fiberId } from "./fiberId";

export const withEarlyReleaseExit_ = <R, E, A>(
   ma: Managed<R, E, A>,
   exit: Ex.Exit<any, any>
): Managed<R, E, readonly [T.IO<unknown>, A]> =>
   new Managed(T.map_(ma.task, ([finalizer, a]) => [finalizer, [T.makeUninterruptible(finalizer(exit)), a]] as const));

export const withEarlyReleaseExit = (exit: Ex.Exit<any, any>) => <R, E, A>(
   ma: Managed<R, E, A>
): Managed<R, E, readonly [T.IO<unknown>, A]> => withEarlyReleaseExit_(ma, exit);

export const withEarlyRelease = <R, E, A>(ma: Managed<R, E, A>): Managed<R, E, readonly [T.IO<unknown>, A]> =>
   chain_(fiberId(), (id) => withEarlyReleaseExit_(ma, Ex.interrupt(id)));

import * as Ex from "../../Exit";
import * as T from "../_internal/aio";
import { Managed } from "../model";
import { chain_ } from "../monad";
import { fiberId } from "./fiberId";

export function withEarlyReleaseExit_<R, E, A>(
  ma: Managed<R, E, A>,
  exit: Ex.Exit<any, any>
): Managed<R, E, readonly [T.IO<unknown>, A]> {
  return new Managed(
    T.map_(
      ma.aio,
      ([finalizer, a]) => [finalizer, [T.makeUninterruptible(finalizer(exit)), a]] as const
    )
  );
}

export function withEarlyReleaseExit(
  exit: Ex.Exit<any, any>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, readonly [T.IO<unknown>, A]> {
  return (ma) => withEarlyReleaseExit_(ma, exit);
}

export function withEarlyRelease<R, E, A>(
  ma: Managed<R, E, A>
): Managed<R, E, readonly [T.IO<unknown>, A]> {
  return chain_(fiberId(), (id) => withEarlyReleaseExit_(ma, Ex.interrupt(id)));
}

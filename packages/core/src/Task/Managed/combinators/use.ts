import * as T from "../_internal/task";
import { tuple } from "../../../Function";
import { sequential } from "../../ExecutionStrategy";
import type { Managed } from "../model";
import * as RM from "../ReleaseMap";
import { releaseAll } from "./releaseAll";

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export function use<A, R2, E2, B>(
  f: (a: A) => T.Task<R2, E2, B>
): <R, E>(self: Managed<R, E, A>) => T.Task<R & R2, E | E2, B> {
  return (self) => use_(self, f);
}

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export function use_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => T.Task<R2, E2, B>
): T.Task<R & R2, E | E2, B> {
  return T.bracketExit_(
    RM.make,
    (rm) =>
      T.chain_(
        T.gives_(self.task, (r: R) => tuple(r, rm)),
        (a) => f(a[1])
      ),
    (rm, ex) => releaseAll(ex, sequential())(rm)
  );
}

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 */
export const useNow: <R, E, A>(ma: Managed<R, E, A>) => T.Task<R, E, A> = use(T.pure);

/**
 * Use the resource until interruption.
 * Useful for resources that you want to acquire and use as long as the application is running, like a HTTP server.
 */
export const useForever: <R, E, A>(ma: Managed<R, E, A>) => T.Task<R, E, never> = use(
  () => T.never
);

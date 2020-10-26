import * as E from "../../../Either";
import * as C from "../../Exit/Cause";
import { chain_, foldCauseM_, halt, pure } from "../core";
import type { Task } from "../model";

/**
 * Returns a task that effectfully "peeks" at the failure or success of
 * this effect.
 */
export const tapBoth_ = <R, E, A, R1, E1, R2, E2>(
   fa: Task<R, E, A>,
   onFailure: (e: E) => Task<R1, E1, any>,
   onSuccess: (a: A) => Task<R2, E2, any>
) =>
   foldCauseM_(
      fa,
      (c) =>
         E.fold_(
            C.failureOrCause(c),
            (e) => chain_(onFailure(e), () => halt(c)),
            (_) => halt(c)
         ),
      onSuccess
   );

/**
 * Returns a task that effectfully "peeks" at the failure or success of
 * this effect.
 */
export const tapBoth = <E, A, R1, E1, R2, E2>(
   onFailure: (e: E) => Task<R1, E1, any>,
   onSuccess: (a: A) => Task<R2, E2, any>
) => <R>(fa: Task<R, E, A>) => tapBoth_(fa, onFailure, onSuccess);

/**
 * Returns a task that effectfully "peeks" at the failure of this effect.
 */
export const tapError_ = <R, E, A, R1, E1>(fa: Task<R, E, A>, f: (e: E) => Task<R1, E1, any>) =>
   foldCauseM_(
      fa,
      (c) =>
         E.fold_(
            C.failureOrCause(c),
            (e) => chain_(f(e), () => halt(c)),
            (_) => halt(c)
         ),
      pure
   );

/**
 * Returns a task that effectfully "peeks" at the failure of this effect.
 */
export const tapError = <E, R1, E1>(f: (e: E) => Task<R1, E1, any>) => <R, A>(fa: Task<R, E, A>) => tapError_(fa, f);

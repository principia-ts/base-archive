import * as T from "../_internal/task";
import { fromTask } from "../core";
import { onExitFirst_ } from "./onExitFirst";

/**
 * Lifts a `Task<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export const makeInterruptible = <A, R1>(release: (a: A) => T.Task<R1, never, unknown>) => <S, R, E>(
   acquire: T.Task<R, E, A>
) => _makeInterruptible(acquire, release);

/**
 * Lifts a `Task<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export const _makeInterruptible = <R, E, A, R1>(
   acquire: T.Task<R, E, A>,
   release: (a: A) => T.Task<R1, never, unknown>
) =>
   onExitFirst_(fromTask(acquire), (e) => {
      switch (e._tag) {
         case "Failure": {
            return T.unit;
         }
         case "Success": {
            return release(e.value);
         }
      }
   });

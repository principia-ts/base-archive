import { fromTask } from "../_core";
import * as T from "../_internal/task";
import type { Managed } from "../model";
import { onExitFirst_ } from "./onExitFirst";

/**
 * Lifts a `Task<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export function makeInterruptible_<R, E, A, R1>(
   acquire: T.Task<R, E, A>,
   release: (a: A) => T.Task<R1, never, unknown>
): Managed<R & R1, E, A> {
   return onExitFirst_(fromTask(acquire), (e) => {
      switch (e._tag) {
         case "Failure": {
            return T.unit();
         }
         case "Success": {
            return release(e.value);
         }
      }
   });
}

/**
 * Lifts a `Task<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export function makeInterruptible<A, R1>(
   release: (a: A) => T.Task<R1, never, unknown>
): <R, E>(acquire: T.Task<R, E, A>) => Managed<R & R1, E, A> {
   return (acquire) => makeInterruptible_(acquire, release);
}

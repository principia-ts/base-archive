import * as T from "../_internal/effect";
import { fromEffect } from "../core";
import { _onExitFirst } from "./onExitFirst";

/**
 * Lifts a `Effect<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export const makeInterruptible = <A, R1>(release: (a: A) => T.Effect<R1, never, unknown>) => <
   S,
   R,
   E
>(
   acquire: T.Effect<R, E, A>
) => _makeInterruptible(acquire, release);

/**
 * Lifts a `Effect<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export const _makeInterruptible = <R, E, A, R1>(
   acquire: T.Effect<R, E, A>,
   release: (a: A) => T.Effect<R1, never, unknown>
) =>
   _onExitFirst(fromEffect(acquire), (e) => {
      switch (e._tag) {
         case "Failure": {
            return T.unit;
         }
         case "Success": {
            return release(e.value);
         }
      }
   });

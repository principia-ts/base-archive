import type { Managed } from "../core";

import * as I from "../_internal/io";
import { fromEffect } from "../core";
import { onExitFirst_ } from "./onExitFirst";

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export function makeInterruptible_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A) => I.IO<R1, never, unknown>
): Managed<R & R1, E, A> {
  return onExitFirst_(fromEffect(acquire), (e) => {
    switch (e._tag) {
      case "Failure": {
        return I.unit();
      }
      case "Success": {
        return release(e.value);
      }
    }
  });
}

/**
 * Lifts a `IO<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export function makeInterruptible<A, R1>(
  release: (a: A) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Managed<R & R1, E, A> {
  return (acquire) => makeInterruptible_(acquire, release);
}

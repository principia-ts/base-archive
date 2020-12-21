import type { Managed } from "../core";

import * as Ex from "../../Exit";
import { foldCauseM_, succeed } from "../core";

/**
 * Returns a Managed that semantically runs the Managed on a fiber,
 * producing an `Exit` for the completion value of the fiber.
 */
export function result<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, Ex.Exit<E, A>> {
  return foldCauseM_(
    ma,
    (cause) => succeed(Ex.failure(cause)),
    (a) => succeed(Ex.succeed(a))
  );
}

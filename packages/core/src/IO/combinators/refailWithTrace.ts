import { traced } from "../Cause";
import { haltWith, succeed } from "../constructors";
import { foldCauseM_ } from "../fold";
import type { IO } from "../model";

/**
 * Attach a wrapping trace pointing to this location in case of error.
 *
 * Useful when joining fibers to make the resulting trace mention
 * the `join` point, otherwise only the traces of joined fibers are
 * included.
 */
export function refailWithTrace<R, E, A>(self: IO<R, E, A>): IO<R, E, A> {
  return foldCauseM_(self, (cause) => haltWith((trace) => traced(cause, trace())), succeed);
}

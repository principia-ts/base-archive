import * as T from "../../Task/_core";
import type { IO } from "../../Task/model";
import type { XPromise } from "../model";

/**
 * Checks for completion of this Promise. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 */
export function isDone<E, A>(promise: XPromise<E, A>): IO<boolean> {
  return T.total(() => promise.state.get._tag === "Done");
}

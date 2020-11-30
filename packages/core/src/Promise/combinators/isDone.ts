import * as I from "../../IO/_core";
import type { UIO } from "../../IO/model";
import type { Promise } from "../model";

/**
 * Checks for completion of this Promise. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 */
export function isDone<E, A>(promise: Promise<E, A>): UIO<boolean> {
  return I.total(() => promise.state.get._tag === "Done");
}

import * as T from "../../Effect/core";
import type { XPromise } from "../XPromise";

/**
 * Checks for completion of this Promise. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 */
export const isDone = <E, A>(promise: XPromise<E, A>): T.UIO<boolean> =>
   T.total(() => promise.state.get._tag === "Done");

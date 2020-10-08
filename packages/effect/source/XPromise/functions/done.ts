import * as T from "../../Effect/core";
import type { UIO } from "../../Effect/Effect";
import type { Exit } from "../../Exit";
import type { XPromise } from "../XPromise";
import { completeWith } from "./completeWith";

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const done = <E, A>(e: Exit<E, A>) => (promise: XPromise<E, A>): UIO<boolean> =>
   completeWith<E, A>(T.done(e))(promise);

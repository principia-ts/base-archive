import type { Exit } from "../../Exit";
import * as T from "../../Task/core";
import type { UIO } from "../../Task/model";
import type { XPromise } from "../model";
import { completeWith } from "./completeWith";

/**
 * Exits the promise with the specified exit, which will be propagated to all
 * fibers waiting on the value of the promise.
 */
export const done = <E, A>(e: Exit<E, A>) => (promise: XPromise<E, A>): UIO<boolean> =>
   completeWith<E, A>(T.done(e))(promise);

import { XPromise } from "../XPromise";
import { to } from "./to";
import * as T from "../../Effect/core";

/**
 * Completes the promise with the result of the specified effect. If the
 * promise has already been completed, the method will produce false.
 *
 * Note that `Promise.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 */
export const complete = <E, A>(e: T.IO<E, A>) => (promise: XPromise<E, A>) => to(promise)(e);

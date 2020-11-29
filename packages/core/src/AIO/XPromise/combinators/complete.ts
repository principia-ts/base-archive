import type { EIO } from "../../AIO/model";
import type { XPromise } from "../model";
import { to } from "./to";

/**
 * Completes the promise with the result of the specified effect. If the
 * promise has already been completed, the method will produce false.
 *
 * Note that `Promise.completeWith` will be much faster, so consider using
 * that if you do not need to memoize the result of the specified effect.
 */
export function complete<E, A>(e: EIO<E, A>) {
  return (promise: XPromise<E, A>) => to(promise)(e);
}

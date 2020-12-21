import type { FIO, UIO } from "../../IO/core";
import type { Promise } from "../model";

import * as I from "../../IO/core";
import { Done } from "../model";

/**
 * Completes the promise with the specified effect. If the promise has
 * already been completed, the method will produce false.
 *
 * Note that since the promise is completed with an IO, the effect will
 * be evaluated each time the value of the promise is retrieved through
 * combinators such as `wait`, potentially producing different results if
 * the effect produces different results on subsequent evaluations. In this
 * case te meaning of the "exactly once" guarantee of `Promise` is that the
 * promise can be completed with exactly one effect. For a version that
 * completes the promise with the result of an IO see
 * `Promise.complete`.
 */
export function completeWith<E, A>(io: FIO<E, A>) {
  return (promise: Promise<E, A>): UIO<boolean> => completeWith_(promise, io);
}

export function completeWith_<E, A>(promise: Promise<E, A>, io: FIO<E, A>): UIO<boolean> {
  return I.total(() => {
    const state = promise.state.get;

    switch (state._tag) {
      case "Done": {
        return false;
      }
      case "Pending": {
        promise.state.set(new Done(io));
        state.joiners.forEach((f) => {
          f(io);
        });
        return true;
      }
    }
  });
}

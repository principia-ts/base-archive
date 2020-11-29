import type { FiberId } from "../../Fiber/FiberId";
import * as T from "../../AIO/_core";
import { fiberId } from "../../AIO/combinators/fiberId";
import { interruptAs as effectInterruptAs } from "../../AIO/combinators/interrupt";
import type { Canceler, EIO, IO } from "../../AIO/model";
import type { XPromise } from "../model";
import { Pending } from "../state";
import { completeWith } from "./completeWith";

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export function interrupt<E, A>(promise: XPromise<E, A>): IO<boolean> {
  return T.chain_(fiberId(), (id) => completeWith<E, A>(effectInterruptAs(id))(promise));
}

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the specified fiber.
 */
export function interruptAs(id: FiberId) {
  return <E, A>(promise: XPromise<E, A>): IO<boolean> =>
    completeWith<E, A>(effectInterruptAs(id))(promise);
}

export function interruptJoiner<E, A>(joiner: (a: EIO<E, A>) => void) {
  return (promise: XPromise<E, A>): Canceler<unknown> =>
    T.total(() => {
      const state = promise.state.get;

      if (state._tag === "Pending") {
        promise.state.set(new Pending(state.joiners.filter((j) => j !== joiner)));
      }
    });
}

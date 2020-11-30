import * as I from "../../IO/_core";
import { fiberId } from "../../IO/combinators/fiberId";
import { interruptAs as effectInterruptAs } from "../../IO/combinators/interrupt";
import type { FiberId } from "../../IO/Fiber/FiberId";
import type { Canceler, FIO, UIO } from "../../IO/model";
import type { Promise } from "../model";
import { Pending } from "../state";
import { completeWith } from "./completeWith";

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export function interrupt<E, A>(promise: Promise<E, A>): UIO<boolean> {
  return I.chain_(fiberId(), (id) => completeWith<E, A>(effectInterruptAs(id))(promise));
}

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the specified fiber.
 */
export function interruptAs(id: FiberId) {
  return <E, A>(promise: Promise<E, A>): UIO<boolean> =>
    completeWith<E, A>(effectInterruptAs(id))(promise);
}

export function interruptJoiner<E, A>(joiner: (a: FIO<E, A>) => void) {
  return (promise: Promise<E, A>): Canceler<unknown> =>
    I.total(() => {
      const state = promise.state.get;

      if (state._tag === "Pending") {
        promise.state.set(new Pending(state.joiners.filter((j) => j !== joiner)));
      }
    });
}

import type { FiberId } from "../../Fiber/FiberId";
import type { Canceler, FIO, UIO } from "../../IO/core";
import type { Promise } from "../model";

import { fiberId } from "../../IO/combinators/fiberId";
import { interruptAs as effectInterruptAs } from "../../IO/combinators/interrupt";
import * as I from "../../IO/core";
import { Pending } from "../model";
import { completeWith } from "./completeWith";

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export function interrupt<E, A>(promise: Promise<E, A>): UIO<boolean> {
  return I.flatMap_(fiberId(), (id) => completeWith<E, A>(effectInterruptAs(id))(promise));
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

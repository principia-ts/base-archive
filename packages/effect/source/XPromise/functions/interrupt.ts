import * as T from "../../Effect/core";
import type { Canceler, IO, UIO } from "../../Effect/Effect";
import { checkFiberId } from "../../Effect/functions/checkFiberId";
import { interruptAs as effectInterruptAs } from "../../Effect/functions/interrupt";
import type { FiberId } from "../../Fiber/FiberId";
import { Pending } from "../state";
import type { XPromise } from "../XPromise";
import { completeWith } from "./completeWith";

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export const interrupt = <E, A>(promise: XPromise<E, A>): UIO<boolean> =>
   T.chain_(checkFiberId(), (id) => completeWith<E, A>(effectInterruptAs(id))(promise));

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the specified fiber.
 */
export const interruptAs = (id: FiberId) => <E, A>(promise: XPromise<E, A>): UIO<boolean> =>
   completeWith<E, A>(effectInterruptAs(id))(promise);

export const interruptJoiner = <E, A>(joiner: (a: IO<E, A>) => void) => (promise: XPromise<E, A>): Canceler<unknown> =>
   T.total(() => {
      const state = promise.state.get;

      if (state._tag === "Pending") {
         promise.state.set(new Pending(state.joiners.filter((j) => j !== joiner)));
      }
   });

import type { FiberId } from "../../Fiber/FiberId";
import * as T from "../../Task/_core";
import { checkFiberId } from "../../Task/combinators/checkFiberId";
import { interruptAs as effectInterruptAs } from "../../Task/combinators/interrupt";
import type { Canceler, EIO, IO } from "../../Task/model";
import type { XPromise } from "../model";
import { Pending } from "../state";
import { completeWith } from "./completeWith";

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the fiber calling this method.
 */
export const interrupt = <E, A>(promise: XPromise<E, A>): IO<boolean> =>
   T.chain_(checkFiberId(), (id) => completeWith<E, A>(effectInterruptAs(id))(promise));

/**
 * Completes the promise with interruption. This will interrupt all fibers
 * waiting on the value of the promise as by the specified fiber.
 */
export const interruptAs = (id: FiberId) => <E, A>(promise: XPromise<E, A>): IO<boolean> =>
   completeWith<E, A>(effectInterruptAs(id))(promise);

export const interruptJoiner = <E, A>(joiner: (a: EIO<E, A>) => void) => (promise: XPromise<E, A>): Canceler<unknown> =>
   T.total(() => {
      const state = promise.state.get;

      if (state._tag === "Pending") {
         promise.state.set(new Pending(state.joiners.filter((j) => j !== joiner)));
      }
   });

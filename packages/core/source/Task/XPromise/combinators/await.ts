import { left, right } from "../../../Either";
import { maybeAsyncInterrupt } from "../../Task/combinators/interrupt";
import type { XPromise } from "../model";
import { Pending } from "../state";
import { interruptJoiner } from "./interrupt";

/**
 * Retrieves the value of the promise, suspending the fiber running the action
 * until the result is available.
 */
const wait = <E, A>(promise: XPromise<E, A>) =>
   maybeAsyncInterrupt<unknown, E, A>((k) => {
      const state = promise.state.get;

      switch (state._tag) {
         case "Done": {
            return right(state.value);
         }
         case "Pending": {
            promise.state.set(new Pending([k, ...state.joiners]));
            return left(interruptJoiner(k)(promise));
         }
      }
   }, promise.blockingOn);

export { wait as await };

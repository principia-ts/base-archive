import * as T from "../../Effect/core";
import { Done } from "../state";
import type { XPromise } from "../XPromise";

/**
 * Unsafe version of done
 */
export const unsafeDone = <E, A>(io: T.IO<E, A>) => (promise: XPromise<E, A>) => {
   const state = promise.state.get;

   if (state._tag === "Pending") {
      promise.state.set(new Done(io));

      Array.from(state.joiners)
         .reverse()
         .forEach((f) => {
            f(io);
         });
   }
};

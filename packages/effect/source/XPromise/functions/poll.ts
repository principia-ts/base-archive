import { just, Maybe, nothing } from "@principia/core/Maybe";

import * as T from "../../Effect/core";
import { XPromise } from "../XPromise";

/**
 * Checks for completion of this Promise. Returns the result effect if this
 * promise has already been completed or a `None` otherwise.
 */
export const poll = <E, A>(promise: XPromise<E, A>): T.UIO<Maybe<T.IO<E, A>>> =>
   T.total(() => {
      const state = promise.state.get;

      switch (state._tag) {
         case "Done": {
            return just(state.value);
         }
         case "Pending": {
            return nothing();
         }
      }
   });

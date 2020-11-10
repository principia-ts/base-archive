import * as T from "../_core";
import type { Cause } from "../../Exit/Cause";
import * as C from "../../Exit/Cause";
import type { Task } from "../model";

/**
 * Exposes all parallel errors in a single call
 */
export const parallelErrors = <R, E, A>(task: Task<R, E, A>): Task<R, ReadonlyArray<E>, A> =>
   T.foldCauseM_(
      task,
      (cause) => {
         const f = C.failures(cause);

         if (f.length === 0) {
            return T.halt(cause as Cause<never>);
         } else {
            return T.fail(f);
         }
      },
      T.succeed
   );

import type { Cause } from "../../Exit/Cause";
import * as C from "../../Exit/Cause";
import * as T from "../_core";
import type { AIO } from "../model";

/**
 * Exposes all parallel errors in a single call
 */
export function parallelErrors<R, E, A>(aio: AIO<R, E, A>): AIO<R, ReadonlyArray<E>, A> {
  return T.foldCauseM_(
    aio,
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
}

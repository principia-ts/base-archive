import * as I from "../_core";
import type { Cause } from "../Cause";
import * as C from "../Cause";
import type { IO } from "../model";

/**
 * Exposes all parallel errors in a single call
 */
export function parallelErrors<R, E, A>(io: IO<R, E, A>): IO<R, ReadonlyArray<E>, A> {
  return I.foldCauseM_(
    io,
    (cause) => {
      const f = C.failures(cause);

      if (f.length === 0) {
        return I.halt(cause as Cause<never>);
      } else {
        return I.fail(f);
      }
    },
    I.succeed
  );
}

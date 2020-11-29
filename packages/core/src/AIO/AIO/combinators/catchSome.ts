import { flow, pipe } from "@principia/prelude";

import * as E from "../../../Either";
import * as O from "../../../Option";
import * as C from "../../Exit/Cause";
import { halt, succeed } from "../constructors";
import { foldCauseM_ } from "../fold";
import type { AIO } from "../model";

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R1, E1, A1>(
  fa: AIO<R, E, A>,
  f: (e: E) => O.Option<AIO<R1, E1, A1>>
): AIO<R & R1, E | E1, A | A1> {
  return foldCauseM_(
    fa,
    (cause): AIO<R1, E | E1, A1> =>
      pipe(
        cause,
        C.failureOrCause,
        E.fold(
          flow(
            f,
            O.getOrElse(() => halt(cause))
          ),
          halt
        )
      ),
    succeed
  );
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome<E, R1, E1, A1>(
  f: (e: E) => O.Option<AIO<R1, E1, A1>>
): <R, A>(fa: AIO<R, E, A>) => AIO<R & R1, E | E1, A | A1> {
  return (fa) => catchSome_(fa, f);
}

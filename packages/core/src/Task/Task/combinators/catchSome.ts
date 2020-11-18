import { flow, pipe } from "@principia/prelude";

import * as E from "../../../Either";
import * as O from "../../../Option";
import * as C from "../../Exit/Cause";
import { halt, succeed } from "../constructors";
import { foldCauseM_ } from "../fold";
import type { Task } from "../model";

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R1, E1, A1>(
  fa: Task<R, E, A>,
  f: (e: E) => O.Option<Task<R1, E1, A1>>
): Task<R & R1, E | E1, A | A1> {
  return foldCauseM_(
    fa,
    (cause): Task<R1, E | E1, A1> =>
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
  f: (e: E) => O.Option<Task<R1, E1, A1>>
): <R, A>(fa: Task<R, E, A>) => Task<R & R1, E | E1, A | A1> {
  return (fa) => catchSome_(fa, f);
}

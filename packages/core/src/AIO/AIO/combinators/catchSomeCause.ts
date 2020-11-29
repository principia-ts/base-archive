import * as O from "../../../Option";
import type { Cause } from "../../Exit/Cause";
import { halt, succeed } from "../constructors";
import { foldCauseM_ } from "../fold";
import type { AIO } from "../model";

/**
 * Recovers from some or all of the error cases with provided cause.
 */
export function catchSomeCause_<R, E, A, R1, E1, A1>(
  ma: AIO<R, E, A>,
  f: (_: Cause<E>) => O.Option<AIO<R1, E1, A1>>
): AIO<R & R1, E | E1, A | A1> {
  return foldCauseM_(
    ma,
    (c): AIO<R1, E1 | E, A1> =>
      O.fold_(
        f(c),
        () => halt(c),
        (a) => a
      ),
    (x) => succeed(x)
  );
}

export function catchSomeCause<E, R1, E1, A1>(
  f: (_: Cause<E>) => O.Option<AIO<R1, E1, A1>>
): <R, A>(ma: AIO<R, E, A>) => AIO<R & R1, E | E1, A | A1> {
  return (ma) => catchSomeCause_(ma, f);
}

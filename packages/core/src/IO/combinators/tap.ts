import * as E from "../../Either";
import { chain_, foldCauseM_, halt, pure } from "../_core";
import * as C from "../Cause";
import type { IO } from "../model";

/**
 * Returns an IO that effectfully "peeks" at the failure or success of
 * this effect.
 */
export function tapBoth_<R, E, A, R1, E1, R2, E2>(
  fa: IO<R, E, A>,
  onFailure: (e: E) => IO<R1, E1, any>,
  onSuccess: (a: A) => IO<R2, E2, any>
) {
  return foldCauseM_(
    fa,
    (c) =>
      E.fold_(
        C.failureOrCause(c),
        (e) => chain_(onFailure(e), () => halt(c)),
        (_) => halt(c)
      ),
    onSuccess
  );
}

/**
 * Returns an IO that effectfully "peeks" at the failure or success of
 * this effect.
 */
export function tapBoth<E, A, R1, E1, R2, E2>(
  onFailure: (e: E) => IO<R1, E1, any>,
  onSuccess: (a: A) => IO<R2, E2, any>
): <R>(fa: IO<R, E, A>) => IO<R & R1 & R2, E | E1 | E2, any> {
  return (fa) => tapBoth_(fa, onFailure, onSuccess);
}

/**
 * Returns an IO that effectfully "peeks" at the failure of this effect.
 */
export function tapError_<R, E, A, R1, E1>(fa: IO<R, E, A>, f: (e: E) => IO<R1, E1, any>) {
  return foldCauseM_(
    fa,
    (c) =>
      E.fold_(
        C.failureOrCause(c),
        (e) => chain_(f(e), () => halt(c)),
        (_) => halt(c)
      ),
    pure
  );
}

/**
 * Returns an IO that effectfully "peeks" at the failure of this effect.
 */
export function tapError<E, R1, E1>(
  f: (e: E) => IO<R1, E1, any>
): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A> {
  return (fa) => tapError_(fa, f);
}

import * as E from "../Either";
import { flow, pipe } from "../Function";
import type { Cause } from "../IO/Cause";
import { failureOrCause } from "../IO/Cause";
import * as I from "./_internal/io";
import { sandbox } from "./combinators/sandbox";
import { halt, succeed } from "./constructors";
import { Managed } from "./model";

/*
 * -------------------------------------------
 * Fold Managed
 * -------------------------------------------
 */

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM_<R, E, A, R1, E1, A1, R2, E2, A2>(
  ma: Managed<R, E, A>,
  onFailure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  onSuccess: (a: A) => Managed<R2, E2, A2>
): Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return new Managed<R & R1 & R2, E1 | E2, A1 | A2>(
    pipe(
      ma.io,
      I.foldCauseM(
        (c) => onFailure(c).io,
        ([_, a]) => onSuccess(a).io
      )
    )
  );
}

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export function foldCauseM<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  onSuccess: (a: A) => Managed<R2, E2, A2>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return (ma) => foldCauseM_(ma, onFailure, onSuccess);
}

/**
 * Recovers from errors by accepting one Managed to execute for the case of an
 * error, and one Managed to execute for the case of success.
 */
export function foldM_<R, E, A, R1, E1, B, R2, E2, C>(
  ma: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, B>,
  g: (a: A) => Managed<R2, E2, C>
): Managed<R & R1 & R2, E1 | E2, B | C> {
  return foldCauseM_(ma, flow(failureOrCause, E.fold(f, halt)), g);
}

/**
 * Recovers from errors by accepting one Managed to execute for the case of an
 * error, and one Managed to execute for the case of success.
 */
export function foldM<E, A, R1, E1, B, R2, E2, C>(
  f: (e: E) => Managed<R1, E1, B>,
  g: (a: A) => Managed<R2, E2, C>
): <R>(ma: Managed<R, E, A>) => Managed<R & R1 & R2, E1 | E2, B | C> {
  return (ma) => foldM_(ma, f, g);
}

export function fold_<R, E, A, B, C>(
  ma: Managed<R, E, A>,
  onError: (e: E) => B,
  onSuccess: (a: A) => C
): Managed<R, never, B | C> {
  return foldM_(ma, flow(onError, succeed), flow(onSuccess, succeed));
}

export function fold<E, A, B, C>(
  onError: (e: E) => B,
  onSuccess: (a: A) => C
): <R>(ma: Managed<R, E, A>) => Managed<R, never, B | C> {
  return (ma) => fold_(ma, onError, onSuccess);
}

export function foldCause_<R, E, A, B, C>(
  ma: Managed<R, E, A>,
  onFailure: (cause: Cause<E>) => B,
  onSuccess: (a: A) => C
): Managed<R, never, B | C> {
  return fold_(sandbox(ma), onFailure, onSuccess);
}

export function foldCause<E, A, B, C>(
  onFailure: (cause: Cause<E>) => B,
  onSuccess: (a: A) => C
): <R>(ma: Managed<R, E, A>) => Managed<R, never, B | C> {
  return (ma) => foldCause_(ma, onFailure, onSuccess);
}

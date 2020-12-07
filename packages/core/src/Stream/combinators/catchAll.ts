import * as E from "../../Either";
import { flow } from "../../Function";
import * as Ca from "../../IO/Cause";
import { halt } from "../constructors";
import type { Stream } from "../model";
import { catchAllCause_ } from "./catchAllCause";

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (e: E) => Stream<R1, E1, O1>
): Stream<R & R1, E1, O | O1> {
  return catchAllCause_(ma, flow(Ca.failureOrCause, E.fold(f, halt)));
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll<E, R1, E1, O1>(
  f: (e: E) => Stream<R1, E1, O1>
): <R, O>(ma: Stream<R, E, O>) => Stream<R & R1, E1, O | O1> {
  return (ma) => catchAll_(ma, f);
}

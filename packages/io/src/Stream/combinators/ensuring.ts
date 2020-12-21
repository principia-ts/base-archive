import type { IO } from "../../IO";

import * as M from "../../Managed";
import { Stream } from "../core";

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring_<R, E, O, R1>(
  ma: Stream<R, E, O>,
  finalizer: IO<R1, never, any>
): Stream<R & R1, E, O> {
  return new Stream(M.ensuring_(ma.proc, finalizer));
}

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring<R1>(
  finalizer: IO<R1, never, any>
): <R, E, O>(ma: Stream<R, E, O>) => Stream<R & R1, E, O> {
  return (ma) => ensuring_(ma, finalizer);
}

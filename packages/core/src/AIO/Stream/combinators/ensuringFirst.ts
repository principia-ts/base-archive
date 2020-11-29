import * as M from "../../Managed";
import type { AIO } from "../../AIO";
import { Stream } from "../model";

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export function ensuringFirst_<R, E, A, R1>(
  stream: Stream<R, E, A>,
  fin: AIO<R1, never, unknown>
): Stream<R & R1, E, A> {
  return new Stream<R & R1, E, A>(M.ensuringFirst_(stream.proc, fin));
}

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export function ensuringFirst<R1>(
  fin: AIO<R1, never, unknown>
): <R, E, A>(stream: Stream<R, E, A>) => Stream<R & R1, E, A> {
  return (stream) => ensuringFirst_(stream, fin);
}

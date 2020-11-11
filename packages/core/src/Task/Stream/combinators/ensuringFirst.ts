import * as M from "../../Managed";
import type { Task } from "../../Task";
import { Stream } from "../model";

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export const ensuringFirst_ = <R, E, A, R1>(stream: Stream<R, E, A>, fin: Task<R1, never, unknown>) =>
   new Stream<R & R1, E, A>(M.ensuringFirst_(stream.proc, fin));

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export const ensuringFirst = <R1>(fin: Task<R1, never, unknown>) => <R, E, A>(stream: Stream<R, E, A>) =>
   ensuringFirst_(stream, fin);

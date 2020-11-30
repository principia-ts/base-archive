import * as E from "../../Either";
import { flow } from "../../Function";
import { fork, halt } from "../_core";
import * as C from "../Cause";
import type { Executor } from "../Fiber";
import type { IO, URIO } from "../model";
import { onError_ } from "./onError";

export function forkWithErrorHandler_<R, E, A, R1>(
  ma: IO<R, E, A>,
  handler: (e: E) => URIO<R1, void>
) {
  return fork(onError_(ma, flow(C.failureOrCause, E.fold(handler, halt))));
}

export function forkWithErrorHandler<E, R1>(
  handler: (e: E) => URIO<R1, void>
): <R, A>(ma: IO<R, E, A>) => URIO<R & R1, Executor<E, A>> {
  return (ma) => forkWithErrorHandler_(ma, handler);
}

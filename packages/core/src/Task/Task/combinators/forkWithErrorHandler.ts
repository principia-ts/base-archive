import { fork, halt } from "../_core";
import * as E from "../../../Either";
import { flow } from "../../../Function";
import * as C from "../../Exit/Cause";
import type { Executor } from "../../Fiber";
import type { RIO, Task } from "../model";
import { onError_ } from "./onError";

export function forkWithErrorHandler_<R, E, A, R1>(ma: Task<R, E, A>, handler: (e: E) => RIO<R1, void>) {
   return fork(onError_(ma, flow(C.failureOrCause, E.fold(handler, halt))));
}

export function forkWithErrorHandler<E, R1>(
   handler: (e: E) => RIO<R1, void>
): <R, A>(ma: Task<R, E, A>) => RIO<R & R1, Executor<E, A>> {
   return (ma) => forkWithErrorHandler_(ma, handler);
}

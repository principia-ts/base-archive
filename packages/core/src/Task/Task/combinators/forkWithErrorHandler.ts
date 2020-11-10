import { fork, halt } from "../_core";
import * as E from "../../../Either";
import { flow } from "../../../Function";
import * as C from "../../Exit/Cause";
import type { RIO, Task } from "../model";
import { onError_ } from "./onError";

export const forkWithErrorHandler_ = <R, E, A, R1>(ma: Task<R, E, A>, handler: (e: E) => RIO<R1, void>) =>
   fork(onError_(ma, flow(C.failureOrCause, E.fold(handler, halt))));

export const forkWithErrorHandler = <E, R1>(handler: (e: E) => RIO<R1, void>) => <R, A>(ma: Task<R, E, A>) =>
   forkWithErrorHandler_(ma, handler);

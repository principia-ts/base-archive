import * as T from "../_core";
import { getAndSet_, makeRef } from "../../XRef";
import type { IO, Task } from "../model";

/**
 * Returns a Task that will be executed at most once, even if it is
 * evaluated multiple times.
 */
export const once = <R, E, A>(task: Task<R, E, A>): IO<Task<R, E, void>> =>
  T.map_(makeRef(true), (ref) => T.whenM_(task, getAndSet_(ref, false)));

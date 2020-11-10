import * as T from "../_core";
import type { Task } from "../model";

export const onFirst = <R, E, A>(task: Task<R, E, A>): Task<R, E, readonly [A, R]> => T.both_(task, T.ask<R>());

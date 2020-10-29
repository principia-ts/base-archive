import * as T from "../_core";
import type { Task } from "../model";

export const onSecond = <R, E, A>(task: Task<R, E, A>): Task<R, E, readonly [R, A]> => T.both_(T.ask<R>(), task);

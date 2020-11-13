import * as T from "../_core";
import type { Task } from "../model";

export function onSecond<R, E, A>(task: Task<R, E, A>): Task<R, E, readonly [R, A]> {
   return T.both_(T.ask<R>(), task);
}

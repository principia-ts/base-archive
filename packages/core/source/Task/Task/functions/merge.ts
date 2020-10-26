import * as T from "../core";
import type { Task } from "../model";

export const merge = <R, E, A>(task: Task<R, E, A>): Task<R, never, A | E> => T.foldM_(task, T.succeed, T.succeed);

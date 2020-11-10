import { foreach_, foreachUnit_ } from "../_core";
import { identity } from "../../../Function";
import type { Task } from "../model";

export const collectAll = <R, E, A>(efs: Iterable<Task<R, E, A>>) => foreach_(efs, identity);

export const collectAllUnit = <R, E, A>(efs: Iterable<Task<R, E, A>>) => foreachUnit_(efs, identity);

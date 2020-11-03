import { traverseI_, traverseIUnit_ } from "../_core";
import { identity } from "../../../Function";
import type { Task } from "../model";

export const sequenceI = <R, E, A>(efs: Iterable<Task<R, E, A>>) => traverseI_(efs, identity);

export const sequenceIUnit = <R, E, A>(efs: Iterable<Task<R, E, A>>) => traverseIUnit_(efs, identity);

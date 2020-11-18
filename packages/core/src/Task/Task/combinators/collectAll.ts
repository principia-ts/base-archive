import { foreach_, foreachUnit_ } from "../_core";
import { identity } from "../../../Function";
import type { Task } from "../model";

export function collectAll<R, E, A>(efs: Iterable<Task<R, E, A>>): Task<R, E, readonly A[]> {
  return foreach_(efs, identity);
}

export function collectAllUnit<R, E, A>(efs: Iterable<Task<R, E, A>>): Task<R, E, void> {
  return foreachUnit_(efs, identity);
}

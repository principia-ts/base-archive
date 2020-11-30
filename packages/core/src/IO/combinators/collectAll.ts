import { identity } from "../../Function";
import { foreach_, foreachUnit_ } from "../_core";
import type { IO } from "../model";

export function collectAll<R, E, A>(efs: Iterable<IO<R, E, A>>): IO<R, E, readonly A[]> {
  return foreach_(efs, identity);
}

export function collectAllUnit<R, E, A>(efs: Iterable<IO<R, E, A>>): IO<R, E, void> {
  return foreachUnit_(efs, identity);
}

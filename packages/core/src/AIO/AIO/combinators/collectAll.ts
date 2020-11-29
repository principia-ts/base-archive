import { identity } from "../../../Function";
import { foreach_, foreachUnit_ } from "../_core";
import type { AIO } from "../model";

export function collectAll<R, E, A>(efs: Iterable<AIO<R, E, A>>): AIO<R, E, readonly A[]> {
  return foreach_(efs, identity);
}

export function collectAllUnit<R, E, A>(efs: Iterable<AIO<R, E, A>>): AIO<R, E, void> {
  return foreachUnit_(efs, identity);
}

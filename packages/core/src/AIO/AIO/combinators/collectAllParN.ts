import { identity } from "../../../Function";
import type { AIO } from "../model";
import { foreachParN_ } from "./foreachParN";
import { foreachUnitParN_ } from "./foreachUnitParN";

export function collectAllParN(
  n: number
): <R, E, A>(efs: Iterable<AIO<R, E, A>>) => AIO<R, E, readonly A[]> {
  return (efs) => foreachParN_(n)(efs, identity);
}

export function collectAllUnitParN(
  n: number
): <R, E, A>(efs: Iterable<AIO<R, E, A>>) => AIO<R, E, void> {
  return (efs) => foreachUnitParN_(n)(efs, identity);
}

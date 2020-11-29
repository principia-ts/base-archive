import { identity } from "../../../Function";
import type { AIO } from "../model";
import { foreachPar_ } from "./foreachPar";
import { foreachUnitPar_ } from "./foreachUnitPar";

export function collectAllPar<R, E, A>(efs: Iterable<AIO<R, E, A>>): AIO<R, E, readonly A[]> {
  return foreachPar_(efs, identity);
}

export function collectAllUnitPar<R, E, A>(efs: Iterable<AIO<R, E, A>>): AIO<R, E, void> {
  return foreachUnitPar_(efs, identity);
}

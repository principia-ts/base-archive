import { identity } from "../../../Function";
import type { Task } from "../model";
import { foreachPar_ } from "./foreachPar";
import { foreachUnitPar_ } from "./foreachUnitPar";

export function collectAllPar<R, E, A>(efs: Iterable<Task<R, E, A>>): Task<R, E, readonly A[]> {
   return foreachPar_(efs, identity);
}

export function collectAllUnitPar<R, E, A>(efs: Iterable<Task<R, E, A>>): Task<R, E, void> {
   return foreachUnitPar_(efs, identity);
}

import { identity } from "../../../Function";
import type { Task } from "../model";
import { foreachParN_ } from "./foreachParN";
import { foreachUnitParN_ } from "./foreachUnitParN";

export function collectAllParN(n: number): <R, E, A>(efs: Iterable<Task<R, E, A>>) => Task<R, E, readonly A[]> {
   return (efs) => foreachParN_(n)(efs, identity);
}

export function collectAllUnitParN(n: number): <R, E, A>(efs: Iterable<Task<R, E, A>>) => Task<R, E, void> {
   return (efs) => foreachUnitParN_(n)(efs, identity);
}

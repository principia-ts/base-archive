import { identity } from "../../../Function";
import type { Task } from "../model";
import { foreachParN_ } from "./foreachParN";
import { foreachUnitParN_ } from "./foreachUnitParN";

export const collectAllParN = (n: number) => <R, E, A>(efs: Iterable<Task<R, E, A>>) => foreachParN_(n)(efs, identity);

export const collectAllUnitParN = (n: number) => <R, E, A>(efs: Iterable<Task<R, E, A>>) =>
   foreachUnitParN_(n)(efs, identity);

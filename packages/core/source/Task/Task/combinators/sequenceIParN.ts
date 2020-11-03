import { identity } from "../../../Function";
import type { Task } from "../model";
import { traverseIParN_ } from "./traverseIParN";
import { traverseIUnitParN_ } from "./traverseIUnitParN";

export const sequenceIParN = (n: number) => <R, E, A>(efs: Iterable<Task<R, E, A>>) => traverseIParN_(n)(efs, identity);

export const sequenceIUnitParN = (n: number) => <R, E, A>(efs: Iterable<Task<R, E, A>>) =>
   traverseIUnitParN_(n)(efs, identity);

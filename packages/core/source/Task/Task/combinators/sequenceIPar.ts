import { identity } from "../../../Function";
import type { Task } from "../model";
import { traverseIPar_ } from "./traverseIPar";
import { traverseIUnitPar_ } from "./traverseIUnitPar";

export const sequenceIPar = <R, E, A>(efs: Iterable<Task<R, E, A>>) => traverseIPar_(efs, identity);

export const sequenceIUnitPar = <R, E, A>(efs: Iterable<Task<R, E, A>>) => traverseIUnitPar_(efs, identity);

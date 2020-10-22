import { identity } from "../../../Function";
import { foreach_, foreachUnit_ } from "../core";
import type { Effect } from "../model";

export const collectAll = <R, E, A>(efs: Iterable<Effect<R, E, A>>) => foreach_(efs, identity);

export const collectAllUnit = <R, E, A>(efs: Iterable<Effect<R, E, A>>) => foreachUnit_(efs, identity);

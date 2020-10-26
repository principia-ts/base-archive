import { fail, foldCauseM_, pure } from "../core";
import type { Task } from "../model";

export const causeAsError = <R, E, A>(fa: Task<R, E, A>) => foldCauseM_(fa, fail, pure);

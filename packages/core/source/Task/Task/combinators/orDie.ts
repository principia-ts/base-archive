import { identity } from "../../../Function";
import type { Task } from "../model";
import { orDieWith_ } from "./orDieWith";

export const orDie = <R, E, A>(ma: Task<R, E, A>): Task<R, never, A> => orDieWith_(ma, identity);

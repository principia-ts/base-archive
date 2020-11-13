import { identity } from "../../../Function";
import type { Task } from "../model";
import { orDieWith_ } from "./orDieWith";

export function orDie<R, E, A>(ma: Task<R, E, A>): Task<R, never, A> {
   return orDieWith_(ma, identity);
}

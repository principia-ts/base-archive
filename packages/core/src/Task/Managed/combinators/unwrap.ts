import type { Task } from "../_internal/task";
import { fromTask } from "../constructors";
import type { Managed } from "../model";
import { flatten } from "../monad";

export function unwrap<R, E, R1, E1, A>(fa: Task<R, E, Managed<R1, E1, A>>): Managed<R & R1, E | E1, A> {
   return flatten(fromTask(fa));
}

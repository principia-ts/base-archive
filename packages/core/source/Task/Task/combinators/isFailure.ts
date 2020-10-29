import type { Task } from "../model";
import { fold_ } from "./fold";

/**
 * Folds a `Task` to a boolean describing whether or not it is a failure
 */
export const isFailure = <R, E, A>(task: Task<R, E, A>): Task<R, never, boolean> =>
   fold_(
      task,
      () => true,
      () => false
   );

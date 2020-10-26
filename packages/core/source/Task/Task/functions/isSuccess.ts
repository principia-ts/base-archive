import type { Task } from "../model";
import { fold_ } from "./fold";

/**
 * Folds a `Task` to a boolean describing whether or not it is a success
 */
export const isSuccess = <R, E, A>(task: Task<R, E, A>): Task<R, never, boolean> =>
   fold_(
      task,
      () => false,
      () => true
   );

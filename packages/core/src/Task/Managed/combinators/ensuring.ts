import type * as T from "../_internal/task";
import type { Managed } from "../model";
import { onExit_ } from "./onExit";

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 */
export function ensuring_<R, E, A, R1>(self: Managed<R, E, A>, f: T.Task<R1, never, any>) {
   return onExit_(self, () => f);
}

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 */
export function ensuring<R1>(f: T.Task<R1, never, any>): <R, E, A>(self: Managed<R, E, A>) => Managed<R & R1, E, A> {
   return (self) => ensuring_(self, f);
}

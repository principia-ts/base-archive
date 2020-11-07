import { fromTask } from "../constructors";
import type { Managed } from "../model";
import { useNow } from "./use";

/**
 * Runs all the finalizers associated with this scope. This is useful to
 * conceptually "close" a scope when composing multiple managed effects.
 * Note that this is only safe if the result of this managed effect is valid
 * outside its scope.
 */
export const release = <R, E, A>(ma: Managed<R, E, A>): Managed<R, E, A> => fromTask(useNow(ma));

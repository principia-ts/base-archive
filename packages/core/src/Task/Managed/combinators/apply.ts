import type * as T from "../_internal/task";
import { Managed } from "../model";
import type { Finalizer, ReleaseMap } from "../ReleaseMap";

export function apply<R, E, A>(task: T.Task<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>): Managed<R, E, A> {
   return new Managed(task);
}

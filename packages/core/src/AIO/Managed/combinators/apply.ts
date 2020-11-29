import type * as T from "../_internal/aio";
import { Managed } from "../model";
import type { Finalizer, ReleaseMap } from "../ReleaseMap";

export function apply<R, E, A>(
  aio: T.AIO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>
): Managed<R, E, A> {
  return new Managed(aio);
}

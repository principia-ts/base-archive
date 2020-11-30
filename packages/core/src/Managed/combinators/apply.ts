import type * as I from "../_internal/io";
import { Managed } from "../model";
import type { Finalizer, ReleaseMap } from "../ReleaseMap";

export function apply<R, E, A>(
  io: I.IO<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>
): Managed<R, E, A> {
  return new Managed(io);
}

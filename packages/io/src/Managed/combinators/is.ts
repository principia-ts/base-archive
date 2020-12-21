import type { Managed } from "../core";

import { fold_ } from "../core";

export function isFailure<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, boolean> {
  return fold_(
    ma,
    () => true,
    () => false
  );
}

export function isSuccess<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, boolean> {
  return fold_(
    ma,
    () => false,
    () => true
  );
}

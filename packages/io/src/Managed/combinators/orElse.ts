import type { Managed } from "../core";

import { foldM_, succeed } from "../core";

export function orElse_<R, E, A, R1, E1, B>(
  ma: Managed<R, E, A>,
  that: () => Managed<R1, E1, B>
): Managed<R & R1, E | E1, A | B> {
  return foldM_(ma, () => that(), succeed);
}

export function orElse<R1, E1, B>(
  that: () => Managed<R1, E1, B>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R & R1, E | E1, A | B> {
  return (ma) => orElse_(ma, that);
}

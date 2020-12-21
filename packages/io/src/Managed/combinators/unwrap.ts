import type { IO } from "../_internal/io";
import type { Managed } from "../core";

import { flatten, fromEffect } from "../core";

export function unwrap<R, E, R1, E1, A>(
  fa: IO<R, E, Managed<R1, E1, A>>
): Managed<R & R1, E | E1, A> {
  return flatten(fromEffect(fa));
}

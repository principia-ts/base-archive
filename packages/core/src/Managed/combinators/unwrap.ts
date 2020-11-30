import type { IO } from "../_internal/io";
import { fromEffect } from "../constructors";
import type { Managed } from "../model";
import { flatten } from "../monad";

export function unwrap<R, E, R1, E1, A>(
  fa: IO<R, E, Managed<R1, E1, A>>
): Managed<R & R1, E | E1, A> {
  return flatten(fromEffect(fa));
}

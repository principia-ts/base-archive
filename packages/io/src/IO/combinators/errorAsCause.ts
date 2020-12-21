import type { Cause } from "../../Cause/core";
import type { IO } from "../core";

import { foldM_, halt, pure } from "../core";

export function errorAsCause<R, E, A>(fa: IO<R, Cause<E>, A>): IO<R, E, A> {
  return foldM_(fa, halt, pure);
}

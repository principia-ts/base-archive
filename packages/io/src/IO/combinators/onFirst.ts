import type { IO } from "../core";

import * as I from "../core";

export function onFirst<R, E, A>(io: IO<R, E, A>): IO<R, E, readonly [A, R]> {
  return I.product_(io, I.ask<R>());
}

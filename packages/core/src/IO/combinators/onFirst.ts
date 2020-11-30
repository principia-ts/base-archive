import * as I from "../_core";
import type { IO } from "../model";

export function onFirst<R, E, A>(io: IO<R, E, A>): IO<R, E, readonly [A, R]> {
  return I.zip_(io, I.ask<R>());
}

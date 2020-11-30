import * as I from "../_core";
import type { IO } from "../model";

export function onSecond<R, E, A>(io: IO<R, E, A>): IO<R, E, readonly [R, A]> {
  return I.zip_(I.ask<R>(), io);
}

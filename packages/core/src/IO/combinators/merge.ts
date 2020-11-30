import * as I from "../_core";
import type { IO } from "../model";

export function merge<R, E, A>(io: IO<R, E, A>): IO<R, never, A | E> {
  return I.foldM_(io, I.succeed, I.succeed);
}

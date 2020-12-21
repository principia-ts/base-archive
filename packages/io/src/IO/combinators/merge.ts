import type { IO } from "../core";

import * as I from "../core";

export function merge<R, E, A>(io: IO<R, E, A>): IO<R, never, A | E> {
  return I.foldM_(io, I.succeed, I.succeed);
}

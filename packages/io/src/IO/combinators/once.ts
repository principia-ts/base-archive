import type { IO, UIO } from "../core";

import { getAndSet_, make } from "../../IORef";
import * as I from "../core";

/**
 * Returns an IO that will be executed at most once, even if it is
 * evaluated multiple times.
 */
export function once<R, E, A>(io: IO<R, E, A>): UIO<IO<R, E, void>> {
  return I.map_(make(true), (ref) => I.whenM_(io, getAndSet_(ref, false)));
}

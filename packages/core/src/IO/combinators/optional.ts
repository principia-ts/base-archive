import { flow } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import * as I from "../_core";

/**
 * Converts an option on errors into an option on values.
 */
export function optional<R, E, A>(ef: I.IO<R, Option<E>, A>): I.IO<R, E, Option<A>> {
  return I.foldM_(
    ef,
    O.fold(() => I.pure(O.none()), I.fail),
    flow(O.some, I.pure)
  );
}

import type { Option } from "@principia/base/data/Option";

import { flow } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import * as I from "../core";

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

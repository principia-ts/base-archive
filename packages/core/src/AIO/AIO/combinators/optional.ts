import { flow } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as T from "../_core";

/**
 * Converts an option on errors into an option on values.
 */
export function optional<R, E, A>(ef: T.AIO<R, Option<E>, A>): T.AIO<R, E, Option<A>> {
  return T.foldM_(
    ef,
    O.fold(() => T.pure(O.none()), T.fail),
    flow(O.some, T.pure)
  );
}

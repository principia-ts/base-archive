import { flow } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as T from "../core";

/**
 * Converts an option on errors into an option on values.
 */
export const optional = <R, E, A>(ef: T.Effect<R, Option<E>, A>): T.Effect<R, E, Option<A>> =>
   T.foldM_(
      ef,
      O.fold(() => T.pure(O.none()), T.fail),
      flow(O.some, T.pure)
   );

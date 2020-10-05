import { flow } from "@principia/core/Function";
import { Maybe } from "@principia/core/Maybe";
import * as Mb from "@principia/core/Maybe";

import * as T from "../core";

/**
 * Converts an option on errors into an option on values.
 */
export const optional = <R, E, A>(ef: T.Effect<R, Maybe<E>, A>): T.Effect<R, E, Maybe<A>> =>
   T._foldM(
      ef,
      Mb.fold(() => T.pure(Mb.nothing()), T.fail),
      flow(Mb.just, T.pure)
   );

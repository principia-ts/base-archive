import { flow } from "@principia/prelude";

import * as O from "../../../Option";
import * as C from "../../Cause";
import type { Effect } from "../core";
import { fail, foldCauseM_, halt, pure } from "../core";

/**
 * Unwraps the optional success of an `Effect`, but can fail with a `None` value.
 */
export const get = <R, E, A>(ma: Effect<R, E, O.Option<A>>): Effect<R, O.Option<E>, A> =>
   foldCauseM_(
      ma,
      flow(C.map(O.some), halt),
      O.fold(() => fail(O.none()), pure)
   );

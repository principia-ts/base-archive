import { flow } from "@principia/prelude";

import type { Task } from "../_core";
import { fail, foldCauseM_, halt, pure } from "../_core";
import * as O from "../../../Option";
import * as C from "../../Exit/Cause";

/**
 * Unwraps the optional success of an `Task`, but can fail with a `None` value.
 */
export function get<R, E, A>(ma: Task<R, E, O.Option<A>>): Task<R, O.Option<E>, A> {
   return foldCauseM_(
      ma,
      flow(C.map(O.some), halt),
      O.fold(() => fail(O.none()), pure)
   );
}

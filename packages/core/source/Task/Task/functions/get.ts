import { flow } from "@principia/prelude";

import * as O from "../../../Option";
import * as C from "../../Exit/Cause";
import type { Task } from "../core";
import { fail, foldCauseM_, halt, pure } from "../core";

/**
 * Unwraps the optional success of an `Task`, but can fail with a `None` value.
 */
export const get = <R, E, A>(ma: Task<R, E, O.Option<A>>): Task<R, O.Option<E>, A> =>
   foldCauseM_(
      ma,
      flow(C.map(O.some), halt),
      O.fold(() => fail(O.none()), pure)
   );

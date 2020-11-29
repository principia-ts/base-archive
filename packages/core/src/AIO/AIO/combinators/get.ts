import { flow } from "@principia/prelude";

import * as O from "../../../Option";
import * as C from "../../Exit/Cause";
import type { AIO } from "../_core";
import { fail, foldCauseM_, halt, pure } from "../_core";

/**
 * Unwraps the optional success of an `AIO`, but can fail with a `None` value.
 */
export function get<R, E, A>(ma: AIO<R, E, O.Option<A>>): AIO<R, O.Option<E>, A> {
  return foldCauseM_(
    ma,
    flow(C.map(O.some), halt),
    O.fold(() => fail(O.none()), pure)
  );
}

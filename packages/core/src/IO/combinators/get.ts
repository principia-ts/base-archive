import { flow } from "@principia/prelude";

import * as O from "../../Option";
import type { IO } from "../_core";
import { fail, foldCauseM_, halt, pure } from "../_core";
import * as C from "../Cause";

/**
 * Unwraps the optional success of an `IO`, but can fail with a `None` value.
 */
export function get<R, E, A>(ma: IO<R, E, O.Option<A>>): IO<R, O.Option<E>, A> {
  return foldCauseM_(
    ma,
    flow(C.map(O.some), halt),
    O.fold(() => fail(O.none()), pure)
  );
}

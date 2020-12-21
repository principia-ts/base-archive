import type { IO } from "../core";

import { flow } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import * as C from "../../Cause/core";
import { fail, foldCauseM_, halt, pure } from "../core";

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

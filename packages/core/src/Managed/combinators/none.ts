import { flow } from "@principia/prelude";

import * as O from "../../Option";
import { fail } from "../constructors";
import { foldM_ } from "../fold";
import type { Managed } from "../model";
import { unit } from "../unit";

/**
 * Requires the option produced by this value to be `None`.
 */
export function none<R, E, A>(ma: Managed<R, E, O.Option<A>>): Managed<R, O.Option<E>, void> {
  return foldM_(
    ma,
    flow(O.some, fail),
    O.fold(
      () => unit(),
      () => fail(O.none())
    )
  );
}

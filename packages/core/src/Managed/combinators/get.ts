import * as E from "../../Either";
import * as O from "../../Option";
import { absolve } from "../fallible";
import { map_ } from "../functor";
import type { Managed } from "../model";

/**
 * Unwraps the optional success of this effect, but can fail with None value.
 */
export function get<R, A>(ma: Managed<R, never, O.Option<A>>): Managed<R, O.Option<never>, A> {
  return absolve(
    map_(
      ma,
      E.fromOption(() => O.none())
    )
  );
}

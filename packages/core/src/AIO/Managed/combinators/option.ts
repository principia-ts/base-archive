import * as O from "../../../Option";
import { fold_ } from "../fold";
import type { Managed } from "../model";

export function option<R, E, A>(ma: Managed<R, E, A>): Managed<R, never, O.Option<A>> {
  return fold_(ma, () => O.none(), O.some);
}

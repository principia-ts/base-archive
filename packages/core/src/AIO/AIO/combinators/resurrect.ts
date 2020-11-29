import { identity } from "@principia/prelude";

import * as O from "../../../Option";
import type { AIO } from "../model";
import { unrefineWith_ } from "./unrefineWith";

/**
 * Recover from the unchecked failure of the `AIO`. (opposite of `orDie`)
 */
export function resurrect<R, E, A>(aio: AIO<R, E, A>): AIO<R, unknown, A> {
  return unrefineWith_(aio, O.some, identity);
}

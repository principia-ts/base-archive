import { identity } from "@principia/prelude";

import * as O from "../../Option";
import type { IO } from "../model";
import { unrefineWith_ } from "./unrefineWith";

/**
 * Recover from the unchecked failure of the `IO`. (opposite of `orDie`)
 */
export function resurrect<R, E, A>(io: IO<R, E, A>): IO<R, unknown, A> {
  return unrefineWith_(io, O.some, identity);
}

import { identity } from "@principia/prelude";

import * as O from "../../../Option";
import type { Task } from "../model";
import { unrefineWith_ } from "./unrefineWith";

/**
 * Recover from the unchecked failure of the `Task`. (opposite of `orDie`)
 */
export const resurrect = <R, E, A>(task: Task<R, E, A>): Task<R, unknown, A> => unrefineWith_(task, O.some, identity);

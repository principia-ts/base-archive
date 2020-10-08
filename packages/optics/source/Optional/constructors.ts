import { constant } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import type { Optional } from "./Optional";

/*
 * -------------------------------------------
 * Optional Constructors
 * -------------------------------------------
 */

export const id = <S>(): Optional<S, S> => ({
   getOption: O.some,
   set: constant
});

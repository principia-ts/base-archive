import { constant } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import type { Optional } from "./Optional";

/*
 * -------------------------------------------
 * Optional Constructors
 * -------------------------------------------
 */

export function id<S>(): Optional<S, S> {
  return {
    getOption: O.some,
    set: constant
  };
}

import { constant } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";

import type { Optional } from "./Optional";

/*
 * -------------------------------------------
 * Optional Constructors
 * -------------------------------------------
 */

export const id = <S>(): Optional<S, S> => ({
   getMaybe: Mb.just,
   set: constant
});

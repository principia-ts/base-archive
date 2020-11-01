import * as O from "@principia/core/Option";
import type { Newtype, Predicate } from "@principia/prelude";

import type { Prism } from "./model";

/*
 * -------------------------------------------
 * Newtype Prism
 * -------------------------------------------
 */

export const newtype = <T extends Newtype<any, any>>(predicate: Predicate<T["_A"]>): Prism<T["_A"], T> => ({
   getOption: (_) => (predicate(_) ? O.some(_) : O.none()),
   reverseGet: (_) => _ as any
});

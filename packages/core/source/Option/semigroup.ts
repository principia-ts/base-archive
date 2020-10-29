import type * as P from "@principia/prelude";

import { none, some } from "./constructors";
import { isSome } from "./guards";
import type { Option } from "./model";

/*
 * -------------------------------------------
 * Senigroup Option
 * -------------------------------------------
 */

export const getApplySemigroup = <A>(S: P.Semigroup<A>): P.Semigroup<Option<A>> => {
   const combine_ = (x: Option<A>, y: Option<A>) =>
      isSome(x) && isSome(y) ? some(S.combine_(x.value, y.value)) : none();
   return {
      combine_,
      combine: (y) => (x) => combine_(x, y)
   };
};

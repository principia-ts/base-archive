import type * as P from "@principia/prelude";

import { none, some } from "./constructors";
import { isNone } from "./guards";
import type { Option } from "./model";
import { getApplySemigroup } from "./semigroup";

/*
 * -------------------------------------------
 * Monoid Option
 * -------------------------------------------
 */

export const getApplyMonoid = <A>(M: P.Monoid<A>): P.Monoid<Option<A>> => ({
   ...getApplySemigroup(M),
   nat: some(M.nat)
});

export const getFirstMonoid = <A = never>(): P.Monoid<Option<A>> => ({
   combine_: (x, y) => (isNone(y) ? x : y),
   combine: (y) => (x) => (isNone(y) ? x : y),
   nat: none()
});

export const getLastMonoid = <A = never>(): P.Monoid<Option<A>> => ({
   combine_: (x, y) => (isNone(x) ? y : x),
   combine: (y) => (x) => (isNone(x) ? y : x),
   nat: none()
});

export const getMonoid = <A>(S: P.Semigroup<A>): P.Monoid<Option<A>> => {
   const combine_ = (x: Option<A>, y: Option<A>) =>
      isNone(x) ? y : isNone(y) ? x : some(S.combine_(x.value, y.value));
   return {
      combine_,
      combine: (y) => (x) => combine_(x, y),
      nat: none()
   };
};

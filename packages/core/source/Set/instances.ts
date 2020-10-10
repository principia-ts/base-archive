import type { Monoid, Semigroup } from "@principia/prelude";
import { fromCombine, makeMonoid } from "@principia/prelude";
import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";
import type { Show } from "@principia/prelude/Show";

import { intersection_, union_ } from "./combinators";
import { empty } from "./constructors";
import { isSubset } from "./guards";

export const getShow = <A>(S: Show<A>): Show<ReadonlySet<A>> => ({
   show: (s) => {
      let elements = "";
      s.forEach((a) => {
         elements += S.show(a) + ", ";
      });
      if (elements !== "") {
         elements = elements.substring(0, elements.length - 2);
      }
      return `Set([${elements}])`;
   }
});

export const getEq = <A>(E: Eq<A>): Eq<ReadonlySet<A>> => {
   const subsetE = isSubset(E);
   return fromEquals((x, y) => subsetE(x)(y) && subsetE(y)(x));
};

export const getUnionMonoid = <A>(E: Eq<A>): Monoid<ReadonlySet<A>> => {
   const unionE_ = union_(E);
   return makeMonoid<ReadonlySet<A>>((x, y) => unionE_(x, y), empty);
};

export const getIntersectionSemigroup = <A>(E: Eq<A>): Semigroup<ReadonlySet<A>> => {
   const intersectionE_ = intersection_(E);
   return fromCombine((x, y) => intersectionE_(x, y));
};

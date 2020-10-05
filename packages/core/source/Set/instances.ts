import { Eq, fromEquals } from "../Eq";
import { Monoid } from "../Monoid";
import { Semigroup } from "../Semigroup";
import { Show } from "../Show";
import { _intersection, _union } from "./combinators";
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
   return fromEquals((x) => (y) => subsetE(x)(y) && subsetE(y)(x));
};

export const getUnionMonoid = <A>(E: Eq<A>): Monoid<ReadonlySet<A>> => {
   const _unionE = _union(E);
   return {
      concat: (x) => (y) => _unionE(x, y),
      empty
   };
};

export const getIntersectionSemigroup = <A>(E: Eq<A>): Semigroup<ReadonlySet<A>> => {
   const _intersectionE = _intersection(E);
   return {
      concat: (x) => (y) => _intersectionE(x, y)
   };
};

import type { Eq } from "@principia/prelude/Eq";

import type { Predicate } from "../Function";
import { not } from "../Function";
import { empty } from "./constructors";
import { elem, elem_, filter_ } from "./methods";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

export const some_ = <A>(set: ReadonlySet<A>, predicate: Predicate<A>) => {
   const values = set.values();
   let e: Next<A>;
   let found = false;
   while (!found && !(e = values.next()).done) {
      found = predicate(e.value);
   }
   return found;
};

export const some = <A>(predicate: Predicate<A>) => (set: ReadonlySet<A>) => some_(set, predicate);

export const every_ = <A>(set: ReadonlySet<A>, predicate: Predicate<A>) => not(some(not(predicate)))(set);

export const every = <A>(predicate: Predicate<A>) => (set: ReadonlySet<A>) => every_(set, predicate);

/**
 * Form the union of two sets
 *
 * @category Combinators
 * @since 1.0.0
 */
export const union_ = <A>(E: Eq<A>) => {
   const elemE = elem(E);
   return (me: ReadonlySet<A>, that: ReadonlySet<A>) => {
      if (me === empty) {
         return that;
      }
      if (that === empty) {
         return me;
      }
      const r = new Set(me);
      that.forEach((e) => {
         if (!elemE(e)(r)) {
            r.add(e);
         }
      });
      return r;
   };
};

/**
 * Form the union of two sets
 *
 * @category Combinators
 * @since 1.0.0
 */
export const union = <A>(E: Eq<A>) => {
   const unionE_ = union_(E);
   return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => unionE_(me, that);
};

/**
 * The set of elements which are in both the first and second set
 *
 * @category Combinators
 * @since 1.0.0
 */
export const intersection_ = <A>(E: Eq<A>) => {
   const elemE = elem(E);
   return (me: ReadonlySet<A>, that: ReadonlySet<A>) => {
      if (me === empty || that === empty) {
         return empty;
      }
      const r = new Set<A>();
      me.forEach((e) => {
         if (elemE(e)(that)) {
            r.add(e);
         }
      });
      return r;
   };
};

/**
 * The set of elements which are in both the first and second set
 *
 * @category Combinators
 * @since 1.0.0
 */
export const intersection = <A>(E: Eq<A>) => {
   const intersectionE_ = intersection_(E);
   return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => intersectionE_(me, that);
};

export const difference_ = <A>(E: Eq<A>) => {
   const elemE_ = elem_(E);
   return (me: ReadonlySet<A>, that: ReadonlySet<A>) => filter_(me, (a) => !elemE_(that, a));
};

export const difference = <A>(E: Eq<A>) => {
   const differenceE_ = difference_(E);
   return (that: ReadonlySet<A>) => (me: ReadonlySet<A>) => differenceE_(me, that);
};

export const insert_ = <A>(E: Eq<A>) => {
   const elemE_ = elem_(E);
   return (set: ReadonlySet<A>, a: A) => {
      if (!elemE_(set, a)) {
         const r = new Set(set);
         r.add(a);
         return r;
      } else {
         return set;
      }
   };
};

export const insert = <A>(E: Eq<A>) => {
   const insertE_ = insert_(E);
   return (a: A) => (set: ReadonlySet<A>) => insertE_(set, a);
};

export const remove_ = <A>(E: Eq<A>) => (set: ReadonlySet<A>, a: A) => filter_(set, (ax) => !E.equals(a)(ax));

export const remove = <A>(E: Eq<A>) => (a: A) => (set: ReadonlySet<A>) => remove_(E)(set, a);

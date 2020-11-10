import type { Eq } from "@principia/prelude/Eq";

import type { Predicate } from "../Function";
import { not } from "../Function";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/*
 * -------------------------------------------
 * Set Guards
 * -------------------------------------------
 */

/**
 * @since 1.0.0
 */
export const some_ = <A>(set: ReadonlySet<A>, predicate: Predicate<A>) => {
   const values = set.values();
   let e: Next<A>;
   let found = false;
   while (!found && !(e = values.next()).done) {
      found = predicate(e.value);
   }
   return found;
};

/**
 * @since 1.0.0
 */
export const some = <A>(predicate: Predicate<A>) => (set: ReadonlySet<A>) => some_(set, predicate);

/**
 * @since 1.0.0
 */
export const every_ = <A>(set: ReadonlySet<A>, predicate: Predicate<A>) => not(some(not(predicate)))(set);

/**
 * @since 1.0.0
 */
export const every = <A>(predicate: Predicate<A>) => (set: ReadonlySet<A>) => every_(set, predicate);

/**
 * Test if a value is a member of a set
 *
 * @since 1.0.0
 */
export const elem_ = <A>(E: Eq<A>) => (set: ReadonlySet<A>, a: A): boolean => {
   const values = set.values();
   let e: Next<A>;
   let found = false;
   while (!found && !(e = values.next()).done) {
      found = E.equals(a)(e.value);
   }
   return found;
};

/**
 * Test if a value is a member of a set
 *
 * @since 1.0.0
 */
export const elem = <A>(E: Eq<A>) => (a: A) => (set: ReadonlySet<A>): boolean => elem_(E)(set, a);

/**
 * `true` if and only if every element in the first set is an element of the second set
 *
 * @since 1.0.0
 */
export const isSubset = <A>(E: Eq<A>): ((that: ReadonlySet<A>) => (me: ReadonlySet<A>) => boolean) => {
   const elemE = elem(E);
   return (that) => every((a: A) => elemE(a)(that));
};

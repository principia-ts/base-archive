import type { Predicate, Refinement } from "../Function";
import type { FreeMonoid } from "./model";

/*
 * -------------------------------------------
 * FreeSemigroup Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export function combine<A>(left: FreeMonoid<A>, right: FreeMonoid<A>): FreeMonoid<A> {
   return {
      _tag: "Combine",
      left,
      right
   };
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function element<A>(a: A): FreeMonoid<A> {
   return {
      _tag: "Element",
      value: a
   };
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function empty<A>(): FreeMonoid<A> {
   return {
      _tag: "Empty"
   };
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function filter_<A, B extends A>(fa: FreeMonoid<A>, f: Refinement<A, B>): FreeMonoid<B>;
export function filter_<A>(fa: FreeMonoid<A>, f: Predicate<A>): FreeMonoid<A>;
export function filter_<A>(fa: FreeMonoid<A>, f: Predicate<A>): FreeMonoid<A> {
   return {
      _tag: "Filter",
      fa,
      f
   };
}

/**
 * @category Constructors
 * @since 1.0.0
 */
export function filter<A, B extends A>(f: Refinement<A, B>): (fa: FreeMonoid<A>) => FreeMonoid<B>;
export function filter<A>(f: Predicate<A>): (fa: FreeMonoid<A>) => FreeMonoid<A>;
export function filter<A>(f: Predicate<A>): (fa: FreeMonoid<A>) => FreeMonoid<A> {
   return (fa) => ({
      _tag: "Filter",
      fa,
      f
   });
}

export function map_<A>(fa: FreeMonoid<A>, f: (a: A) => A): FreeMonoid<A> {
   return {
      _tag: "Map",
      fa,
      f
   };
}

export function map<A>(f: (a: A) => A): (fa: FreeMonoid<A>) => FreeMonoid<A> {
   return (fa) => ({
      _tag: "Map",
      fa,
      f
   });
}

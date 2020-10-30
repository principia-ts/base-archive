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
export const combine = <A>(left: FreeMonoid<A>, right: FreeMonoid<A>): FreeMonoid<A> => ({
   _tag: "Combine",
   left,
   right
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const element = <A>(a: A): FreeMonoid<A> => ({
   _tag: "Element",
   value: a
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const empty = <A>(): FreeMonoid<A> => ({
   _tag: "Empty"
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const filter_: {
   <A, B extends A>(fa: FreeMonoid<A>, f: Refinement<A, B>): FreeMonoid<B>;
   <A>(fa: FreeMonoid<A>, f: Predicate<A>): FreeMonoid<A>;
} = <A>(fa: FreeMonoid<A>, f: Predicate<A>): FreeMonoid<A> => ({
   _tag: "Filter",
   fa,
   f
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const filter: {
   <A, B extends A>(f: Refinement<A, B>): (fa: FreeMonoid<A>) => FreeMonoid<B>;
   <A>(f: Predicate<A>): (fa: FreeMonoid<A>) => FreeMonoid<A>;
} = <A>(f: Predicate<A>) => (fa: FreeMonoid<A>): FreeMonoid<A> => ({
   _tag: "Filter",
   fa,
   f
});

export const map_ = <A>(fa: FreeMonoid<A>, f: (a: A) => A): FreeMonoid<A> => ({
   _tag: "Map",
   fa,
   f
});

export const map = <A>(f: (a: A) => A) => (fa: FreeMonoid<A>): FreeMonoid<A> => ({
   _tag: "Map",
   fa,
   f
});

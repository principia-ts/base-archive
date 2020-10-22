import type { Predicate, Refinement } from "../Function";
import type { FreeSemigroup } from "./model";

/*
 * -------------------------------------------
 * FreeSemigroup Constructors
 * -------------------------------------------
 */

/**
 * @category Constructors
 * @since 1.0.0
 */
export const combine = <A>(left: FreeSemigroup<A>, right: FreeSemigroup<A>): FreeSemigroup<A> => ({
   _tag: "Combine",
   left,
   right
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const element = <A>(a: A): FreeSemigroup<A> => ({
   _tag: "Element",
   value: a
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const empty = <A>(): FreeSemigroup<A> => ({
   _tag: "Empty"
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const filter_: {
   <A, B extends A>(fa: FreeSemigroup<A>, f: Refinement<A, B>): FreeSemigroup<B>;
   <A>(fa: FreeSemigroup<A>, f: Predicate<A>): FreeSemigroup<A>;
} = <A>(fa: FreeSemigroup<A>, f: Predicate<A>): FreeSemigroup<A> => ({
   _tag: "Filter",
   fa,
   f
});

/**
 * @category Constructors
 * @since 1.0.0
 */
export const filter: {
   <A, B extends A>(f: Refinement<A, B>): (fa: FreeSemigroup<A>) => FreeSemigroup<B>;
   <A>(f: Predicate<A>): (fa: FreeSemigroup<A>) => FreeSemigroup<A>;
} = <A>(f: Predicate<A>) => (fa: FreeSemigroup<A>): FreeSemigroup<A> => ({
   _tag: "Filter",
   fa,
   f
});

export const map_ = <A>(fa: FreeSemigroup<A>, f: (a: A) => A): FreeSemigroup<A> => ({
   _tag: "Map",
   fa,
   f
});

export const map = <A>(f: (a: A) => A) => (fa: FreeSemigroup<A>): FreeSemigroup<A> => ({
   _tag: "Map",
   fa,
   f
});

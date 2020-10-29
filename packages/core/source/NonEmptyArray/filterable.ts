import * as A from "../Array";
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import type { Option } from "../Option";
import { fromArray } from "./constructors";
import type { NonEmptyArray } from "./model";

/*
 * -------------------------------------------
 * Filterable NonEmptyArray
 * -------------------------------------------
 */

/**
 * ```haskell
 * filterWithIndex_ :: (NonEmptyArray f, Index k) =>
 *    (f a, ((k, a) -> Boolean)) -> Option (f a)
 * ```
 */
export const filterWithIndex_: {
   <A, B extends A>(fa: NonEmptyArray<A>, f: RefinementWithIndex<number, A, B>): Option<NonEmptyArray<B>>;
   <A>(fa: NonEmptyArray<A>, f: PredicateWithIndex<number, A>): Option<NonEmptyArray<A>>;
} = <A>(fa: NonEmptyArray<A>, f: PredicateWithIndex<number, A>): Option<NonEmptyArray<A>> =>
   fromArray(A.filterWithIndex_(fa, f));

/**
 * ```haskell
 * filterWithIndex :: (NonEmptyArray f, Index k) =>
 *    ((k, a) -> Boolean) -> f a -> Option (f a)
 * ```
 */
export const filterWithIndex: {
   <A, B extends A>(f: RefinementWithIndex<number, A, B>): (fa: NonEmptyArray<A>) => Option<NonEmptyArray<B>>;
   <A>(f: PredicateWithIndex<number, A>): (fa: NonEmptyArray<A>) => Option<NonEmptyArray<A>>;
} = <A>(f: PredicateWithIndex<number, A>) => (fa: NonEmptyArray<A>): Option<NonEmptyArray<A>> =>
   filterWithIndex_(fa, f);

/**
 * ```haskell
 * filter_ :: NonEmptyArray f => (f a, (a -> Boolean)) -> Option (f a)
 * ```
 */
export const filter_: {
   <A, B extends A>(fa: NonEmptyArray<A>, f: Refinement<A, B>): Option<NonEmptyArray<B>>;
   <A>(fa: NonEmptyArray<A>, f: Predicate<A>): Option<NonEmptyArray<A>>;
} = <A>(fa: NonEmptyArray<A>, f: Predicate<A>): Option<NonEmptyArray<A>> => filterWithIndex_(fa, (_, a) => f(a));

/**
 * ```haskell
 * filter :: NonEmptyArray f => (a -> Boolean) -> f a -> Option (f a)
 * ```
 */
export const filter: {
   <A, B extends A>(f: Refinement<A, B>): (fa: NonEmptyArray<A>) => Option<NonEmptyArray<B>>;
   <A>(f: Predicate<A>): (fa: NonEmptyArray<A>) => Option<NonEmptyArray<A>>;
} = <A>(f: Predicate<A>) => (fa: NonEmptyArray<A>) => filterWithIndex_(fa, (_, a) => f(a));

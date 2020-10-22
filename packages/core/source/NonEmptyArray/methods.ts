import type * as P from "@principia/prelude";

import * as A from "../Array";
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import type { Option } from "../Option";
import { head } from "./combinators";
import { fromArray } from "./constructors";
import type { NonEmptyArray, URI, V } from "./model";

/**
 * ```haskell
 * pure :: a -> NonEmptyArray a
 * ```
 *
 * Lifts a value into a `NonEmptyArray`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure = <A>(a: A): NonEmptyArray<A> => [a];

/**
 * ```haskell
 * unit :: () -> NonEmptyArray ()
 * ```
 *
 * @category Unit
 * @since 1.0.0
 */
export const unit = (): NonEmptyArray<void> => [undefined];

/**
 * ```haskell
 * mapWithIndex_ :: (FunctorWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> b)) -> f k b
 * ```
 *
 * Map a `NonEmptyArray` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex_: <A, B>(
   fa: NonEmptyArray<A>,
   f: (i: number, a: A) => B
) => NonEmptyArray<B> = A.mapWithIndex_ as any;

/**
 * ```haskell
 * mapWithIndex :: (FunctorWithIndex f, Index k) =>
 *    ((k, a) -> b) -> f k a -> f k b
 * ```
 *
 * Map a `NonEmptyArray` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex: <A, B>(
   f: (i: number, a: A) => B
) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.mapWithIndex as any;

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Map over a `NonEmptyArray` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const map_: <A, B>(fa: NonEmptyArray<A>, f: (a: A) => B) => NonEmptyArray<B> = A.map_ as any;

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Map over a `NonEmptyArray` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const map: <A, B>(f: (a: A) => B) => (fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.map as any;

/**
 * ```haskell
 * ap_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const ap_: <A, B>(fab: NonEmptyArray<(a: A) => B>, fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.ap_ as any;

/**
 * ```haskell
 * ap :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const ap: <A>(fa: NonEmptyArray<A>) => <B>(fab: NonEmptyArray<(a: A) => B>) => NonEmptyArray<B> = A.ap_ as any;

/**
 * ```haskell
 * apFirst_ :: Apply f => (f a, f b) -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export const apFirst_: <A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>) => NonEmptyArray<A> = A.apFirst_ as any;

/**
 * ```haskell
 * apFirst :: Apply f => f b -> f a -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export const apFirst: <B>(fb: NonEmptyArray<B>) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<A> = A.apFirst as any;

/**
 * ```haskell
 * apSecond_ :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const apSecond_: <A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>) => NonEmptyArray<B> = A.apSecond_ as any;

/**
 * ```haskell
 * apSecond :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const apSecond: <B>(fb: NonEmptyArray<B>) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<B> = A.apSecond as any;

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `NonEmptyArray`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten: <A>(mma: NonEmptyArray<NonEmptyArray<A>>) => NonEmptyArray<A> = A.flatten as any;

export const chainWithIndex_: <A, B>(
   ma: NonEmptyArray<A>,
   f: (i: number, a: A) => NonEmptyArray<B>
) => NonEmptyArray<B> = A.chainWithIndex_ as any;

export const chainWithIndex: <A, B>(
   f: (i: number, a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = A.chainWithIndex as any;

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain_: <A, B>(ma: NonEmptyArray<A>, f: (a: A) => NonEmptyArray<B>) => NonEmptyArray<B> = A.chain_ as any;

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain: <A, B>(
   f: (a: A) => NonEmptyArray<B>
) => (ma: NonEmptyArray<A>) => NonEmptyArray<B> = A.chain as any;

/**
 * ```haskell
 * tap_ :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap_: <A, B>(ma: NonEmptyArray<A>, f: (a: A) => NonEmptyArray<B>) => NonEmptyArray<A> = A.tap_ as any;

/**
 * ```haskell
 * tap :: Monad m => (a -> mb) -> m a -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap: <A, B>(f: (a: A) => NonEmptyArray<B>) => (ma: NonEmptyArray<A>) => NonEmptyArray<A> = A.tap as any;

export const zipWith_: <A, B, C>(
   fa: NonEmptyArray<A>,
   fb: NonEmptyArray<B>,
   f: (a: A, b: B) => C
) => NonEmptyArray<C> = A.zipWith_ as any;

export const zipWith: <A, B, C>(
   fb: NonEmptyArray<B>,
   f: (a: A, b: B) => C
) => (fa: NonEmptyArray<A>) => NonEmptyArray<C> = A.zipWith as any;

export const zip_: <A, B>(fa: NonEmptyArray<A>, fb: NonEmptyArray<B>) => NonEmptyArray<readonly [A, B]> = A.zip_ as any;

export const zip: <B>(
   fb: NonEmptyArray<B>
) => <A>(fa: NonEmptyArray<A>) => NonEmptyArray<readonly [A, B]> = A.zip as any;

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

/**
 * ```haskell
 * reduceWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, b, a) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceWithIndex_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (i: number, b: B, a: A) => B) => B =
   A.reduceWithIndex_;

/**
 * ```haskell
 * reduceWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, b, a) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceWithIndex: <A, B>(b: B, f: (i: number, b: B, a: A) => B) => (fa: NonEmptyArray<A>) => B =
   A.reduceWithIndex;

/**
 * ```haskell
 * reduce_ :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduce_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (b: B, a: A) => B) => B = A.reduce_;

/**
 * ```haskell
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: NonEmptyArray<A>) => B = A.reduce;

/**
 * ```haskell
 * reduceRightWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, a, b) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceRightWithIndex_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (i: number, a: A, b: B) => B) => B =
   A.reduceRightWithIndex_;

/**
 * ```haskell
 * reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, a, b) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceRightWithIndex: <A, B>(b: B, f: (i: number, a: A, b: B) => B) => (fa: NonEmptyArray<A>) => B =
   A.reduceRightWithIndex;

/**
 * ```haskell
 * reduceRight_ :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduceRight_: <A, B>(fa: NonEmptyArray<A>, b: B, f: (a: A, b: B) => B) => B = A.reduceRight_;

/**
 * ```haskell
 * reduceRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduceRight: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: NonEmptyArray<A>) => B = A.reduceRight;

/**
 * ```haskell
 * foldMapWithIndex_ :: (Semigroup s, FoldableWithIndex f, Index k) =>
 *    s b -> (f a, ((k, a) -> b) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const foldMapWithIndex_ = <S>(S: P.Semigroup<S>) => <A>(fa: NonEmptyArray<A>, f: (i: number, a: A) => S): S =>
   A.reduceWithIndex_(fa.slice(1), f(0, fa[0]), (i, s, a) => S.combine_(s, f(i + 1, a)));

/**
 * ```haskell
 * foldMapWithIndex :: (Semigroup s, FoldableWithIndex f, Index k) =>
 *    s b -> ((k, a) -> b) -> f a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const foldMapWithIndex = <S>(S: P.Semigroup<S>) => <A>(f: (i: number, a: A) => S) => (fa: NonEmptyArray<A>): S =>
   foldMapWithIndex_(S)(fa, f);

/**
 * ```haskell
 * foldMap_ :: (Semigroup s, Foldable f) => s b -> (f a, (a -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const foldMap_ = <S>(S: P.Semigroup<S>) => <A>(fa: NonEmptyArray<A>, f: (a: A) => S): S =>
   A.reduce_(fa.slice(1), f(fa[0]), (s, a) => S.combine_(s, f(a)));

/**
 * ```haskell
 * foldMap :: (Semigroup s, Foldable f) => s b -> (a -> b) -> f a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const foldMap = <S>(S: P.Semigroup<S>) => <A>(f: (a: A) => S) => (fa: NonEmptyArray<A>): S => foldMap_(S)(fa, f);

/**
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * Combines two `NonEmptyArray`s
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt_: <A>(fa: NonEmptyArray<A>, that: () => NonEmptyArray<A>) => NonEmptyArray<A> = A.alt_ as any;

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> f a -> f a
 * ```
 *
 * Combines two `NonEmptyArray`s
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt: <A>(that: () => NonEmptyArray<A>) => (fa: NonEmptyArray<A>) => NonEmptyArray<A> = A.alt as any;

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export const duplicate: <A>(wa: NonEmptyArray<A>) => NonEmptyArray<NonEmptyArray<A>> = A.duplicate as any;

/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export const extend_: <A, B>(
   wa: NonEmptyArray<A>,
   f: (wa: NonEmptyArray<A>) => B
) => NonEmptyArray<B> = A.extend_ as any;

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export const extend: <A, B>(
   f: (wa: NonEmptyArray<A>) => B
) => (wa: NonEmptyArray<A>) => NonEmptyArray<B> = A.extend as any;

/**
 * ```haskell
 * traverseWithIndex_ :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g
 *    -> (t k a, ((k, a) -> g b))
 *    -> g (t k b)
 * ```
 *
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const traverseWithIndex_: P.TraverseWithIndexFn_<[URI], V> = A.traverseWithIndex_ as any;

/**
 * ```haskell
 * traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g
 *    -> ((k, a) -> g b)
 *    -> t k a
 *    -> g (t k b)
 * ```
 *
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const traverseWithIndex: P.TraverseWithIndexFn<[URI], V> = A.traverseWithIndex as any;

/**
 * ```haskell
 * traverse_ :: (Applicative g, Traversable t) =>
 *    g
 *    -> (t a, (a -> g b))
 *    -> g (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<[URI], V> = A.traverse_ as any;

/**
 * ```haskell
 * traverse :: (Applicative g, Traversable t) =>
 *    g
 *    -> (a -> g b)
 *    -> g a
 *    -> g (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[URI], V> = A.traverse as any;

/**
 * ```haskell
 * sequence :: (Applicative f, Traversable t) => t (f a) -> f (t a)
 * ```
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[URI], V> = A.sequence as any;

/**
 * ```haskell
 * extract :: (Comonad m) => m a -> a
 * ```
 *
 * @category Comonad
 * @since 1.0.0
 */
export const extract: <A>(ma: NonEmptyArray<A>) => A = head;

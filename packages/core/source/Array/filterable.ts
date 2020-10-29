import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import type { Option } from "../Option";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Filterable Array
 * -------------------------------------------
 */

/**
 * ```haskell
 * filterWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f a, ((k, a) -> Boolean)) -> f a
 * ```
 *
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export const filterWithIndex_: {
   <A, B extends A>(fa: ReadonlyArray<A>, f: RefinementWithIndex<number, A, B>): ReadonlyArray<B>;
   <A>(fa: ReadonlyArray<A>, f: PredicateWithIndex<number, A>): ReadonlyArray<A>;
} = <A>(fa: ReadonlyArray<A>, f: PredicateWithIndex<number, A>): ReadonlyArray<A> => {
   const result: Array<A> = [];
   for (let i = 0; i < fa.length; i++) {
      const a = fa[i];
      if (f(i, a)) {
         result.push(a);
      }
   }
   return result;
};

/**
 * ```haskell
 * filterWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Boolean) -> f a -> f a
 * ```
 *
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export const filterWithIndex: {
   <A, B extends A>(f: RefinementWithIndex<number, A, B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B>;
   <A>(f: PredicateWithIndex<number, A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A>;
} = <A>(f: PredicateWithIndex<number, A>) => (fa: ReadonlyArray<A>): ReadonlyArray<A> => filterWithIndex_(fa, f);

/**
 * ```haskell
 * filter_ :: Filterable f => (f a, (a -> Boolean)) -> f a
 * ```
 *
 * @category Filterable
 * @since 1.0.0
 */
export const filter_: {
   <A, B extends A>(fa: ReadonlyArray<A>, f: Refinement<A, B>): ReadonlyArray<B>;
   <A>(fa: ReadonlyArray<A>, f: Predicate<A>): ReadonlyArray<A>;
} = <A>(fa: ReadonlyArray<A>, f: Predicate<A>): ReadonlyArray<A> => filterWithIndex_(fa, (_, a) => f(a));

/**
 * ```haskell
 * filter :: Filterable f => (a -> Boolean) -> f a -> f a
 * ```
 *
 * @category Filterable
 * @since 1.0.0
 */
export const filter: {
   <A, B extends A>(f: Refinement<A, B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B>;
   <A>(f: Predicate<A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A>;
} = <A>(f: Predicate<A>) => (fa: ReadonlyArray<A>) => filterWithIndex_(fa, (_, a) => f(a));

/**
 * ```haskell
 * mapOptionWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f a, ((k, a) -> Option b)) -> f k b
 * ```
 *
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export const mapOptionWithIndex_ = <A, B>(
   fa: ReadonlyArray<A>,
   f: (i: number, a: A) => Option<B>
): ReadonlyArray<B> => {
   const result = [];
   for (let i = 0; i < fa.length; i++) {
      const optionB = f(i, fa[i]);
      if (optionB._tag === "Some") {
         result.push(optionB.value);
      }
   }
   return result;
};

/**
 * ```haskell
 * mapOptionWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Option b) -> f a -> f k b
 * ```
 *
 * @category FilterableWithIndex
 * @since 1.0.0
 */
export const mapOptionWithIndex = <A, B>(f: (i: number, a: A) => Option<B>) => (
   fa: ReadonlyArray<A>
): ReadonlyArray<B> => mapOptionWithIndex_(fa, f);

/**
 * ```haskell
 * mapOption_ :: Filterable f => (f a, (a -> Option b)) -> f b
 * ```
 *
 * @category Filterable
 * @since 1.0.0
 */
export const mapOption_ = <A, B>(fa: ReadonlyArray<A>, f: (a: A) => Option<B>): ReadonlyArray<B> =>
   mapOptionWithIndex_(fa, (_, a) => f(a));

/**
 * ```haskell
 * mapOption :: Filterable f => (a -> Option b) -> f a -> f b
 * ```
 *
 * @category Filterable
 * @since 1.0.0
 */
export const mapOption = <A, B>(f: (a: A) => Option<B>) => (fa: ReadonlyArray<A>): ReadonlyArray<B> =>
   mapOptionWithIndex_(fa, (_, a) => f(a));

/**
 * ```haskell
 * partitionWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f a, ((k, a) -> Boolean)) -> Separated (f a) (f a)
 * ```
 */
export const partitionWithIndex_: {
   <A, B extends A>(ta: ReadonlyArray<A>, refinement: RefinementWithIndex<number, A, B>): Separated<
      ReadonlyArray<A>,
      ReadonlyArray<B>
   >;
   <A>(ta: ReadonlyArray<A>, predicate: PredicateWithIndex<number, A>): Separated<ReadonlyArray<A>, ReadonlyArray<A>>;
} = <A>(ta: ReadonlyArray<A>, predicate: PredicateWithIndex<number, A>) => {
   const left: Array<A> = [];
   const right: Array<A> = [];
   for (let i = 0; i < ta.length; i++) {
      const a = ta[i];
      if (predicate(i, a)) {
         right.push(a);
      } else {
         left.push(a);
      }
   }
   return {
      left,
      right
   };
};

/**
 * ```haskell
 * partitionWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Boolean) -> f a -> Separated (f a) (f a)
 * ```
 */
export const partitionWithIndex: {
   <A, B extends A>(refinement: RefinementWithIndex<number, A, B>): (
      ta: ReadonlyArray<A>
   ) => Separated<ReadonlyArray<A>, ReadonlyArray<B>>;
   <A>(predicate: PredicateWithIndex<number, A>): (
      ta: ReadonlyArray<A>
   ) => Separated<ReadonlyArray<A>, ReadonlyArray<A>>;
} = <A>(predicate: PredicateWithIndex<number, A>) => (ta: ReadonlyArray<A>) => partitionWithIndex_(ta, predicate);

/**
 * ```haskell
 * partition_ :: Filterable f => (f a, (a -> Boolean)) -> Separated (f a) (f a)
 * ```
 */
export const partition_: {
   <A, B extends A>(ta: ReadonlyArray<A>, refinement: Refinement<A, B>): Separated<ReadonlyArray<A>, ReadonlyArray<B>>;
   <A>(ta: ReadonlyArray<A>, predicate: Predicate<A>): Separated<ReadonlyArray<A>, ReadonlyArray<A>>;
} = <A>(ta: ReadonlyArray<A>, predicate: Predicate<A>) => partitionWithIndex_(ta, (_, a) => predicate(a));

/**
 * ```haskell
 * partition :: Filterable f => (a -> Boolean) -> f a -> Separated (f a) (f a)
 * ```
 */
export const partition: {
   <A, B extends A>(refinement: Refinement<A, B>): (
      ta: ReadonlyArray<A>
   ) => Separated<ReadonlyArray<A>, ReadonlyArray<B>>;
   <A>(predicate: Predicate<A>): (ta: ReadonlyArray<A>) => Separated<ReadonlyArray<A>, ReadonlyArray<A>>;
} = <A>(predicate: Predicate<A>) => (ta: ReadonlyArray<A>) => partitionWithIndex_(ta, (_, a) => predicate(a));

/**
 * ```haskell
 * mapEitherWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f a, ((k, a) -> Either b c)) -> Separated (f b) (f c)
 * ```
 */
export const mapEitherWithIndex_ = <A, B, C>(
   ta: ReadonlyArray<A>,
   f: (i: number, a: A) => Either<B, C>
): Separated<ReadonlyArray<B>, ReadonlyArray<C>> => {
   const left = [];
   const right = [];
   for (let i = 0; i < ta.length; i++) {
      const e = f(i, ta[i]);
      if (e._tag === "Left") {
         left.push(e.left);
      } else {
         right.push(e.right);
      }
   }
   return {
      left,
      right
   };
};

/**
 * ```haskell
 * mapEitherWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Either b c) -> f a -> Separated (f b) (f c)
 * ```
 */
export const mapEitherWithIndex = <A, B, C>(f: (i: number, a: A) => Either<B, C>) => (
   ta: ReadonlyArray<A>
): Separated<ReadonlyArray<B>, ReadonlyArray<C>> => mapEitherWithIndex_(ta, f);

/**
 * ```haskell
 * mapEither_ :: Filterable f => (f a, (a -> Either b c)) -> Separated (f b) (f c)
 * ```
 */
export const mapEither_ = <A, B, C>(
   ta: ReadonlyArray<A>,
   f: (a: A) => Either<B, C>
): Separated<ReadonlyArray<B>, ReadonlyArray<C>> => mapEitherWithIndex_(ta, (_, a) => f(a));

/**
 * ```haskell
 * mapEither :: Filterable f => (a -> Either b c) -> f a -> Separated (f b) (f c)
 * ```
 */
export const mapEither = <A, B, C>(f: (a: A) => Either<B, C>) => (
   ta: ReadonlyArray<A>
): Separated<ReadonlyArray<B>, ReadonlyArray<C>> => mapEitherWithIndex_(ta, (_, a) => f(a));

export const Filterable: P.Filterable<[URI], V> = HKT.instance({
   filter_,
   mapOption_,
   partition_,
   mapEither_,
   filter,
   mapOption,
   partition,
   mapEither
});

export const FilterableWithIndex: P.FilterableWithIndex<[URI], V> = HKT.instance({
   filterWithIndex_,
   mapOptionWithIndex_,
   mapEitherWithIndex_,
   mapOptionWithIndex,
   filterWithIndex,
   mapEitherWithIndex,
   partitionWithIndex_,
   partitionWithIndex
});

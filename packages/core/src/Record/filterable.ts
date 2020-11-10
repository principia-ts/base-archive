import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import type { Option } from "../Option";
import type { ReadonlyRecord, URI, V } from "./model";
import { keys } from "./utils";

const _hasOwnProperty = Object.prototype.hasOwnProperty;

/*
 * -------------------------------------------
 * Filterable Record
 * -------------------------------------------
 */

/**
 * ```haskell
 * filterWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f a, ((k, a) -> Boolean)) -> f a
 * ```
 */
export const filterWithIndex_: {
   <N extends string, A, B extends A>(
      fa: ReadonlyRecord<N, A>,
      refinement: RefinementWithIndex<N, A, B>
   ): ReadonlyRecord<string, B>;
   <N extends string, A>(fa: ReadonlyRecord<N, A>, predicate: PredicateWithIndex<N, A>): ReadonlyRecord<string, A>;
} = <A>(fa: ReadonlyRecord<string, A>, predicate: PredicateWithIndex<string, A>) => {
   const out: Record<string, A> = {};
   let changed = false;
   for (const key in fa) {
      if (_hasOwnProperty.call(fa, key)) {
         const a = fa[key];
         if (predicate(key, a)) {
            out[key] = a;
         } else {
            changed = true;
         }
      }
   }
   return changed ? out : fa;
};

/**
 * ```haskell
 * filterWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Boolean) -> f a -> f a
 * ```
 */
export const filterWithIndex: {
   <N extends string, A, B extends A>(refinement: RefinementWithIndex<N, A, B>): (
      fa: ReadonlyRecord<N, A>
   ) => ReadonlyRecord<string, B>;
   <N extends string, A>(predicate: PredicateWithIndex<N, A>): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, A>;
} = <A>(predicate: PredicateWithIndex<string, A>) => (fa: ReadonlyRecord<string, A>) => filterWithIndex_(fa, predicate);

/**
 * ```haskell
 * filter_ :: Filterable f => (f a, (a -> Boolean)) -> f a
 * ```
 */
export const filter_: {
   <N extends string, A, B extends A>(fa: ReadonlyRecord<N, A>, refinement: Refinement<A, B>): ReadonlyRecord<
      string,
      B
   >;
   <N extends string, A>(fa: ReadonlyRecord<N, A>, predicate: Predicate<A>): ReadonlyRecord<string, A>;
} = <A>(fa: ReadonlyRecord<string, A>, predicate: Predicate<A>) => filterWithIndex_(fa, (_, a) => predicate(a));

/**
 * ```haskell
 * filter :: Filterable f => (a -> Boolean) -> f a -> f a
 * ```
 */
export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): <N extends string>(
      fa: ReadonlyRecord<N, A>
   ) => ReadonlyRecord<string, B>;
   <A>(predicate: Predicate<A>): <N extends string>(fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, A>;
} = <A>(predicate: Predicate<A>) => (fa: ReadonlyRecord<string, A>) => filter_(fa, predicate);

/**
 * ```haskell
 * mapOptionWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f a, ((k, a) -> Option b)) -> f b
 * ```
 */
export const mapOptionWithIndex_ = <N extends string, A, B>(
   fa: ReadonlyRecord<N, A>,
   f: (k: N, a: A) => Option<B>
): ReadonlyRecord<string, B> => {
   const r: Record<string, B> = {} as any;
   const ks = keys(fa);
   for (let i = 0; i < ks.length; i++) {
      const key = ks[i];
      const optionB = f(key, fa[key]);
      if (optionB._tag === "Some") {
         r[key] = optionB.value;
      }
   }
   return r;
};

/**
 * ```haskell
 * mapOptionWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Option b) -> f a -> f b
 * ```
 */
export const mapOptionWithIndex = <N extends string, A, B>(f: (k: N, a: A) => Option<B>) => (
   fa: ReadonlyRecord<N, A>
): ReadonlyRecord<string, B> => mapOptionWithIndex_(fa, f);

/**
 * ```haskell
 * mapOption_ :: Filterable f => (f a, (a -> Option b)) -> f b
 * ```
 */
export const mapOption_ = <N extends string, A, B>(
   fa: ReadonlyRecord<N, A>,
   f: (a: A) => Option<B>
): ReadonlyRecord<string, B> => mapOptionWithIndex_(fa, (_, a) => f(a));

/**
 * ```haskell
 * mapOption :: Filterable f => (a -> Option b) -> f a -> f b
 * ```
 */
export const mapOption = <A, B>(f: (a: A) => Option<B>) => <N extends string>(
   fa: ReadonlyRecord<N, A>
): ReadonlyRecord<string, B> => mapOption_(fa, f);

/**
 * ```haskell
 * partitionWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f a, ((k, a) -> Boolean)) -> Separated (f a) (f a)
 * ```
 */
export const partitionWithIndex_: {
   <N extends string, A, B extends A>(fa: ReadonlyRecord<N, A>, refinement: RefinementWithIndex<N, A, B>): Separated<
      ReadonlyRecord<string, A>,
      ReadonlyRecord<string, B>
   >;
   <N extends string, A>(fa: ReadonlyRecord<N, A>, predicate: PredicateWithIndex<N, A>): Separated<
      ReadonlyRecord<string, A>,
      ReadonlyRecord<string, A>
   >;
} = <A>(fa: ReadonlyRecord<string, A>, predicate: PredicateWithIndex<string, A>) => {
   const left: Record<string, A> = {};
   const right: Record<string, A> = {};
   const ks = keys(fa);
   for (let i = 0; i < ks.length; i++) {
      const key = ks[i];
      const a = fa[key];
      if (predicate(key, a)) {
         right[key] = a;
      } else {
         left[key] = a;
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
 *    (k, a) -> Boolean) -> f a -> Separated (f a) (f a)
 * ```
 */
export const partitionWithIndex: {
   <N extends string, A, B extends A>(refinement: RefinementWithIndex<N, A, B>): (
      fa: ReadonlyRecord<N, A>
   ) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, B>>;
   <N extends string, A>(predicate: PredicateWithIndex<N, A>): (
      fa: ReadonlyRecord<N, A>
   ) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>>;
} = <A>(predicate: PredicateWithIndex<string, A>) => (fa: ReadonlyRecord<string, A>) =>
   partitionWithIndex_(fa, predicate);

/**
 * ```haskell
 * partition_ :: Filterable f => (f a, (a -> Boolean)) -> Separated (f a) (f a)
 * ```
 */
export const partition_: {
   <N extends string, A, B extends A>(fa: ReadonlyRecord<N, A>, refinement: Refinement<A, B>): Separated<
      ReadonlyRecord<string, A>,
      ReadonlyRecord<string, B>
   >;
   <N extends string, A>(fa: ReadonlyRecord<N, A>, predicate: Predicate<A>): Separated<
      ReadonlyRecord<string, A>,
      ReadonlyRecord<string, A>
   >;
} = <A>(fa: ReadonlyRecord<string, A>, predicate: Predicate<A>) => partitionWithIndex_(fa, (_, a) => predicate(a));

/**
 * ```haskell
 * partition :: Filterable f => (a -> Boolean) -> f a -> Separated (f a) (f a)
 * ```
 */
export const partition: {
   <A, B extends A>(refinement: Refinement<A, B>): <N extends string>(
      fa: ReadonlyRecord<N, A>
   ) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, B>>;
   <A>(predicate: Predicate<A>): <N extends string>(
      fa: ReadonlyRecord<N, A>
   ) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>>;
} = <A>(predicate: Predicate<A>) => (fa: ReadonlyRecord<string, A>) => partition_(fa, predicate);

/**
 * ```haskell
 * mapEitherWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f a, ((k, a) -> Either b c)) -> Separated (f b) (f c)
 * ```
 */
export const mapEitherWithIndex_ = <N extends string, A, B, C>(
   fa: ReadonlyRecord<N, A>,
   f: (k: N, a: A) => Either<B, C>
): Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> => {
   const left: Record<string, B> = {};
   const right: Record<string, C> = {};
   const ks = keys(fa);
   for (let i = 0; i < ks.length; i++) {
      const key = ks[i];
      const e = f(key, fa[key]);
      switch (e._tag) {
         case "Left":
            left[key] = e.left;
            break;
         case "Right":
            right[key] = e.right;
            break;
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
export const mapEitherWithIndex = <N extends string, A, B, C>(f: (k: N, a: A) => Either<B, C>) => (
   fa: ReadonlyRecord<N, A>
): Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> => mapEitherWithIndex_(fa, f);

/**
 * ```haskell
 * mapEither_ :: Filterable f => (f a, (a -> Either b c)) -> Separated (f b) (f c)
 * ```
 */
export const mapEither_ = <N extends string, A, B, C>(
   fa: ReadonlyRecord<N, A>,
   f: (a: A) => Either<B, C>
): Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> => mapEitherWithIndex_(fa, (_, a) => f(a));

/**
 * ```haskell
 * mapEither :: Filterable f => (a -> Either b c) -> f a -> Separated (f b) (f c)
 * ```
 */
export const mapEither = <A, B, C>(f: (a: A) => Either<B, C>) => <N extends string>(
   fa: ReadonlyRecord<N, A>
): Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> => mapEither_(fa, f);

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
   partitionWithIndex_,
   mapEitherWithIndex_,
   filterWithIndex,
   mapOptionWithIndex,
   partitionWithIndex,
   mapEitherWithIndex
});

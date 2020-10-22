import * as TC from "@principia/prelude";
import type { Monoid } from "@principia/prelude/Monoid";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import { flow, identity, pipe } from "../Function";
import type { NonEmptyArray } from "../NonEmptyArray";
import type { Option } from "../Option";
import { empty } from "./constructors";
import type { URI, V } from "./model";

/**
 * @internal
 */
const __snoc = <A>(end: A) => (init: ReadonlyArray<A>): NonEmptyArray<A> => {
   const len = init.length;
   const r = Array(len + 1);
   for (let i = 0; i < len; i++) {
      r[i] = init[i];
   }
   r[len] = end;
   return (r as unknown) as NonEmptyArray<A>;
};

/**
 * @internal
 */
const __append = <A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): ReadonlyArray<A> => {
   const lenx = xs.length;
   if (lenx === 0) {
      return ys;
   }
   const leny = ys.length;
   if (leny === 0) {
      return xs;
   }
   const r = Array(lenx + leny);
   for (let i = 0; i < lenx; i++) {
      r[i] = xs[i];
   }
   for (let i = 0; i < leny; i++) {
      r[i + lenx] = ys[i];
   }
   return r;
};

/*
 * -------------------------------------------
 * Methods
 * -------------------------------------------
 */

/**
 * ```haskell
 * pure :: a -> Array a
 * ```
 *
 * Lifts a value into an Array
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure = <A>(a: A): ReadonlyArray<A> => [a];

/**
 * ```haskell
 * unit :: () -> Array ()
 * ```
 */
export const unit: () => ReadonlyArray<void> = empty;

/**
 * ```haskell
 * mapWithIndex_ :: (FunctorWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> b)) -> f k b
 * ```
 *
 * Map an `Array` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex_ = <A, B>(fa: ReadonlyArray<A>, f: (i: number, a: A) => B): ReadonlyArray<B> => {
   const len = fa.length;
   const bs = new Array(len);
   for (let i = 0; i < len; i++) {
      bs[i] = f(i, fa[i]);
   }
   return bs;
};

/**
 * ```haskell
 * mapWithIndex :: (FunctorWithIndex f, Index k) =>
 *    ((k, a) -> b) -> f k a -> f k b
 * ```
 *
 * Map an `Array` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex = <A, B>(f: (i: number, a: A) => B) => (fa: ReadonlyArray<A>): ReadonlyArray<B> =>
   mapWithIndex_(fa, f);

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Map over an `Array` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const map_ = <A, B>(fa: ReadonlyArray<A>, f: (a: A) => B): ReadonlyArray<B> => mapWithIndex_(fa, (_, a) => f(a));

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Map over an `Array` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const map = <A, B>(f: (a: A) => B) => (fa: ReadonlyArray<A>): ReadonlyArray<B> => map_(fa, f);

export const zipWith_ = <A, B, C>(
   fa: ReadonlyArray<A>,
   fb: ReadonlyArray<B>,
   f: (a: A, b: B) => C
): ReadonlyArray<C> => {
   const fc = [];
   const len = Math.min(fa.length, fb.length);
   for (let i = 0; i < len; i++) {
      fc[i] = f(fa[i], fb[i]);
   }
   return fc;
};

export const zipWith = <A, B, C>(fb: ReadonlyArray<B>, f: (a: A, b: B) => C) => (
   fa: ReadonlyArray<A>
): ReadonlyArray<C> => zipWith_(fa, fb, f);

export const zip_ = <A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<readonly [A, B]> =>
   zipWith_(fa, fb, (a, b) => [a, b]);

export const zip = <B>(fb: ReadonlyArray<B>) => <A>(fa: ReadonlyArray<A>): ReadonlyArray<readonly [A, B]> =>
   zip_(fa, fb);

export const chainWithIndex_: <A, B>(
   fa: ReadonlyArray<A>,
   f: (i: number, a: A) => ReadonlyArray<B>
) => ReadonlyArray<B> = (fa, f) => {
   let outLen = 0;
   const len = fa.length;
   const temp = new Array(len);
   for (let i = 0; i < len; i++) {
      const e = fa[i];
      const arr = f(i, e);
      outLen += arr.length;
      temp[i] = arr;
   }
   const out = Array(outLen);
   let start = 0;
   for (let i = 0; i < len; i++) {
      const arr = temp[i];
      const l = arr.length;
      for (let j = 0; j < l; j++) {
         out[j + start] = arr[j];
      }
      start += l;
   }
   return out;
};

export const chainWithIndex: <A, B>(
   f: (i: number, a: A) => ReadonlyArray<B>
) => (fa: ReadonlyArray<A>) => ReadonlyArray<B> = (f) => (fa) => chainWithIndex_(fa, f);

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
export const chain_ = <A, B>(fa: ReadonlyArray<A>, f: (a: A) => ReadonlyArray<B>): ReadonlyArray<B> =>
   chainWithIndex_(fa, (_, a) => f(a));

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
export const chain = <A, B>(f: (a: A) => ReadonlyArray<B>) => (fa: ReadonlyArray<A>): ReadonlyArray<B> => chain_(fa, f);

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
export const flatten = <A>(mma: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<A> => {
   let rLen = 0;
   const len = mma.length;
   for (let i = 0; i < len; i++) {
      rLen += mma[i].length;
   }
   const r = Array(rLen);
   let start = 0;
   for (let i = 0; i < len; i++) {
      const arr = mma[i];
      const l = arr.length;
      for (let j = 0; j < l; j++) {
         r[j + start] = arr[j];
      }
      start += l;
   }
   return r;
};

/**
 * bind :: Monad m => m a -> (a -> m b) -> m b
 */
export const bind: TC.BindFn<[URI], V> = (fa) => (f) => chain_(fa, f);

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
export const tap_ = <A, B>(ma: ReadonlyArray<A>, f: (a: A) => ReadonlyArray<B>): ReadonlyArray<A> =>
   chain_(ma, (a) =>
      pipe(
         f(a),
         map(() => a)
      )
   );

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
export const tap = <A, B>(f: (a: A) => ReadonlyArray<B>) => (ma: ReadonlyArray<A>): ReadonlyArray<A> => tap_(ma, f);

export const chainFirst = tap;

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
export const ap_ = <A, B>(fab: ReadonlyArray<(a: A) => B>, fa: ReadonlyArray<A>): ReadonlyArray<B> =>
   flatten(
      pipe(
         fab,
         map((f) => pipe(fa, map(f)))
      )
   );

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
export const ap = <A>(fa: ReadonlyArray<A>) => <B>(fab: ReadonlyArray<(a: A) => B>): ReadonlyArray<B> => ap_(fab, fa);

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
export const apFirst_ = <A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<A> =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

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
export const apFirst: <B>(fb: ReadonlyArray<B>) => <A>(fa: ReadonlyArray<A>) => ReadonlyArray<A> = (fb) =>
   flow(
      map((a) => () => a),
      ap(fb)
   );

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
export const apSecond_ = <A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<B> =>
   ap_(
      map_(fa, () => (b: B) => b),
      fb
   );

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
export const apSecond = <B>(fb: ReadonlyArray<B>): (<A>(fa: ReadonlyArray<A>) => ReadonlyArray<B>) =>
   flow(
      map(() => (b: B) => b),
      ap(fb)
   );

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

export const extend_ = <A, B>(wa: ReadonlyArray<A>, f: (as: ReadonlyArray<A>) => B): ReadonlyArray<B> =>
   mapWithIndex_(wa, (i, _) => f(wa.slice(i)));

/**
 * extend :: Extend w => (w a -> b) -> w a -> w b
 */
export const extend = <A, B>(f: (as: ReadonlyArray<A>) => B) => (wa: ReadonlyArray<A>): ReadonlyArray<B> =>
   extend_(wa, f);

/**
 * ```haskell
 * compact :: Compactable c => c (Maybe a) -> c a
 * ```
 */
export const compact = <A>(as: ReadonlyArray<Option<A>>): ReadonlyArray<A> => mapOption_(as, identity);

/**
 * ```haskell
 * separate :: Compactable c => c (Either a b) -> Separated (c a) (c b)
 * ```
 */
export const separate = <E, A>(fa: ReadonlyArray<Either<E, A>>): Separated<ReadonlyArray<E>, ReadonlyArray<A>> => {
   const len = fa.length;
   const left = [];
   const right = [];
   for (let i = 0; i < len; i++) {
      const e = fa[i];
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
 * reduceWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, b, a) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceWithIndex_ = <A, B>(fa: ReadonlyArray<A>, b: B, f: (i: number, b: B, a: A) => B): B => {
   const len = fa.length;
   let r = b;
   for (let i = 0; i < len; i++) {
      r = f(i, r, fa[i]);
   }
   return r;
};

/**
 * ```haskell
 * reduceWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, b, a) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceWithIndex = <A, B>(b: B, f: (i: number, b: B, a: A) => B) => (fa: ReadonlyArray<A>): B =>
   reduceWithIndex_(fa, b, f);

/**
 * ```haskell
 * reduce_ :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduce_ = <A, B>(fa: ReadonlyArray<A>, b: B, f: (b: B, a: A) => B): B =>
   reduceWithIndex_(fa, b, (_, b, a) => f(b, a));

/**
 * ```haskell
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: ReadonlyArray<A>): B =>
   reduceWithIndex_(fa, b, (_, b, a) => f(b, a));

/**
 * ```haskell
 * reduceRightWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t a, b, ((k, a, b) -> b)) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceRightWithIndex_ = <A, B>(fa: ReadonlyArray<A>, b: B, f: (i: number, a: A, b: B) => B): B => {
   let r = b;
   for (let i = fa.length - 1; i >= 0; i--) {
      r = f(i, fa[i], r);
   }
   return r;
};

/**
 * ```haskell
 * reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, a, b) -> b)) -> t a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const reduceRightWithIndex = <A, B>(b: B, f: (i: number, a: A, b: B) => B) => (fa: ReadonlyArray<A>): B =>
   reduceRightWithIndex_(fa, b, f);

/**
 * ```haskell
 * reduceRight_ :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduceRight_ = <A, B>(fa: ReadonlyArray<A>, b: B, f: (a: A, b: B) => B): B =>
   reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b));

/**
 * ```haskell
 * reduceRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: ReadonlyArray<A>): B => reduceRight_(fa, b, f);

/**
 * ```haskell
 * foldMapWithIndex_ :: (Monoid m, FoldableWithIndex f, Index k) =>
 *    m b -> (f a, ((k, a) -> b) -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const foldMapWithIndex_ = <M>(M: Monoid<M>) => <A>(fa: ReadonlyArray<A>, f: (i: number, a: A) => M): M =>
   reduceWithIndex_(fa, M.nat, (i, b, a) => M.combine_(b, f(i, a)));

/**
 * ```haskell
 * foldMapWithIndex :: (Monoid m, FoldableWithIndex f, Index k) =>
 *    m b -> ((k, a) -> b) -> f a -> b
 * ```
 *
 * @category FoldableWithIndex
 * @since 1.0.0
 */
export const foldMapWithIndex = <M>(M: Monoid<M>) => <A>(f: (i: number, a: A) => M) => (fa: ReadonlyArray<A>) =>
   foldMapWithIndex_(M)(fa, f);

/**
 * ```haskell
 * foldMap_ :: (Monoid m, Foldable f) =>
 *    m b -> (f a, (a -> b)) -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const foldMap_ = <M>(M: Monoid<M>): (<A>(fa: ReadonlyArray<A>, f: (a: A) => M) => M) => {
   const foldMapWithIndexM_ = foldMapWithIndex_(M);
   return (fa, f) => foldMapWithIndexM_(fa, (_, a) => f(a));
};

/**
 * ```haskell
 * foldMap :: (Monoid m, Foldable f) => m b -> (a -> b) -> f a -> b
 * ```
 *
 * @category Foldable
 * @since 1.0.0
 */
export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: ReadonlyArray<A>): M => foldMap_(M)(fa, f);

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

/**
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * Combines two `Array`s
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt_ = <A>(fa: ReadonlyArray<A>, that: () => ReadonlyArray<A>): ReadonlyArray<A> => __append(fa, that());

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> f a -> f a
 * ```
 *
 * Combines two `Array`s
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt = <A>(that: () => ReadonlyArray<A>) => (fa: ReadonlyArray<A>): ReadonlyArray<A> => alt_(fa, that);

/**
 * ```haskell
 * traverseWithIndex_ :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g
 *    -> (t a, ((k, a) -> g b))
 *    -> g (t b)
 * ```
 *
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const traverseWithIndex_: TC.TraverseWithIndexFn_<[URI], V> = TC.implementTraverseWithIndex_<[URI], V>()(
   (_) => (G) => (ta, f) =>
      pipe(
         ta,
         reduceWithIndex(
            G.map_(G.unit(), () => empty()),
            (i, fbs, a) =>
               pipe(
                  fbs,
                  G.both(f(i, a)),
                  G.map(([bs, b]) => __snoc(b)(bs))
               )
         )
      )
);

/**
 * ```haskell
 * traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g
 *    -> ((k, a) -> g b)
 *    -> t a
 *    -> g (t b)
 * ```
 *
 * @category TraversableWithIndex
 * @since 1.0.0
 */
export const traverseWithIndex: TC.TraverseWithIndexFn<[URI], V> = (A) => (f) => (ta) => traverseWithIndex_(A)(ta, f);

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
export const traverse_: TC.TraverseFn_<[URI], V> = (A) => (ta, f) => traverseWithIndex_(A)(ta, (_, a) => f(a));

/**
 * ```haskell
 * traverse :: (Applicative g, Traversable t) =>
 *    g
 *    -> (a -> g b)
 *    -> t a
 *    -> g (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: TC.TraverseFn<[URI], V> = (A) => (f) => (ta) => traverseWithIndex_(A)(ta, (_, a) => f(a));

/**
 * ```haskell
 * sequence :: (Applicative g, Traversable t) => g -> t a -> g (t a)
 * ```
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: TC.SequenceFn<[URI], V> = TC.implementSequence<[URI], V>()((_) => (G) => (ta) =>
   pipe(
      ta,
      reduce(
         G.map_(G.unit(), () => empty()),
         (fas, fa) =>
            pipe(
               fas,
               G.both(fa),
               G.map(([as, a]) => __snoc(a)(as))
            )
      )
   )
);

/**
 * ```haskell
 * witherWithIndex_ :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g
 *    -> (w a, ((k, a) -> g (w (Maybe b))))
 *    -> g (w b)
 * ```
 */
export const witherWithIndex_: TC.WitherWithIndexFn_<[URI], V> = (G) => {
   const traverseG = traverseWithIndex_(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(compact));
};

/**
 * ```haskell
 * witherWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g
 *    -> ((k, a)
 *    -> g (w (Maybe b)))
 *    -> w a
 *    -> g (w b)
 * ```
 */
export const witherWithIndex: TC.WitherWithIndexFn<[URI], V> = (G) => (f) => (wa) => witherWithIndex_(G)(wa, f);

/**
 * ```haskell
 * wither_ :: (Applicative g, Witherable w) =>
 *    g
 *    -> (w a, (a -> g (w (Maybe b))))
 *    -> g (w b)
 * ```
 */
export const wither_: TC.WitherFn_<[URI], V> = (G) => (wa, f) => witherWithIndex_(G)(wa, (_, a) => f(a));

/**
 * ```haskell
 * wither :: (Applicative g, Witherable w) =>
 *    g
 *    -> (a -> g (w (Maybe b)))
 *    -> w a
 *    -> g (w b)
 * ```
 */
export const wither: TC.WitherFn<[URI], V> = (G) => (f) => (wa) => wither_(G)(wa, f);

/**
 * ```haskell
 * wiltWithIndex_ :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g
 *    -> (w a, ((k, a) -> g (w (Either b c))))
 *    -> g (Separated (w b) (w c))
 * ```
 */
export const wiltWithIndex_: TC.WiltWithIndexFn_<[URI], V> = (G) => {
   const traverseG = traverseWithIndex_(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(separate));
};

/**
 * ```haskell
 * wiltWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g
 *    -> ((k, a) -> g (w (Either b c)))
 *    -> w a
 *    -> g (Separated (w b) (w c))
 * ```
 */
export const wiltWithIndex: TC.WiltWithIndexFn<[URI], V> = (G) => (f) => (wa) => wiltWithIndex_(G)(wa, f);

/**
 * ```haskell
 * wilt_ :: (Applicative g, Witherable w) =>
 *    g
 *    -> (w a, (a -> g (w (Either b c))))
 *    -> g (Separated (w b) (w c))
 * ```
 */
export const wilt_: TC.WiltFn_<[URI], V> = (G) => (wa, f) => wiltWithIndex_(G)(wa, (_, a) => f(a));

/**
 * ```haskell
 * wilt :: (Applicative g, Witherable w) =>
 *    g
 *    -> (a -> g (w (Either b c)))
 *    -> w a
 *    -> g (Separated (w b) (w c))
 * ```
 */
export const wilt: TC.WiltFn<[URI], V> = (G) => (f) => (wa) => wilt_(G)(wa, f);

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 */
export const duplicate: <A>(wa: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>> = (wa) => extend_(wa, identity);

export const unfold = <A, B>(b: B, f: (b: B) => Option<readonly [A, B]>): ReadonlyArray<A> => {
   const ret = [];
   let bb = b;
   /* eslint-disable-next-line no-constant-condition */
   while (true) {
      const mt = f(bb);
      if (mt._tag === "Some") {
         const [a, b] = mt.value;
         ret.push(a);
         bb = b;
      } else {
         break;
      }
   }
   return ret;
};

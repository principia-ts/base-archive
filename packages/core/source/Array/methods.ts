import type { Either } from "../Either";
import { flow, identity, pipe, Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import type { Maybe } from "../Maybe";
import type { Monoid } from "../Monoid";
import type { NonEmptyArray } from "../NonEmptyArray";
import * as TC from "../typeclass-index";
import type { Separated } from "../Utils";
import type { URI, V } from "./Array";
import { empty } from "./constructors";

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
 * _mapWithIndex :: (FunctorWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> b)) -> f k b
 * ```
 *
 * Map an `Array` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const _mapWithIndex = <A, B>(fa: ReadonlyArray<A>, f: (i: number, a: A) => B): ReadonlyArray<B> => {
   const len = fa.length;
   const bs = new Array(len);
   for (let i = 0; i < len; i++) {
      bs[i] = f(i, fa[i]);
   }
   return bs;
};

/**
 * ```haskell
 * _mapWithIndex :: (FunctorWithIndex f, Index k) =>
 *    ((k, a) -> b) -> f k a -> f k b
 * ```
 *
 * Map an `Array` passing the index to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex = <A, B>(f: (i: number, a: A) => B) => (fa: ReadonlyArray<A>): ReadonlyArray<B> =>
   _mapWithIndex(fa, f);

/**
 * ```haskell
 * _map :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Map over an `Array` passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const _map = <A, B>(fa: ReadonlyArray<A>, f: (a: A) => B): ReadonlyArray<B> => _mapWithIndex(fa, (_, a) => f(a));

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
export const map = <A, B>(f: (a: A) => B) => (fa: ReadonlyArray<A>): ReadonlyArray<B> => _map(fa, f);

export const _zipWith = <A, B, C>(
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
): ReadonlyArray<C> => _zipWith(fa, fb, f);

export const _zip = <A, B>(fa: ReadonlyArray<A>, fb: ReadonlyArray<B>): ReadonlyArray<readonly [A, B]> =>
   _zipWith(fa, fb, (a, b) => [a, b]);

export const zip = <B>(fb: ReadonlyArray<B>) => <A>(fa: ReadonlyArray<A>): ReadonlyArray<readonly [A, B]> =>
   _zip(fa, fb);

export const _chainWithIndex: <A, B>(
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

export const chainWithIdex: <A, B>(
   f: (i: number, a: A) => ReadonlyArray<B>
) => (fa: ReadonlyArray<A>) => ReadonlyArray<B> = (f) => (fa) => _chainWithIndex(fa, f);

export const _chain = <A, B>(fa: ReadonlyArray<A>, f: (a: A) => ReadonlyArray<B>): ReadonlyArray<B> =>
   _chainWithIndex(fa, (_, a) => f(a));

/**
 * chain :: Monad m => (a -> b) -> m a -> m b
 */
export const chain = <A, B>(f: (a: A) => ReadonlyArray<B>) => (fa: ReadonlyArray<A>): ReadonlyArray<B> => _chain(fa, f);

/**
 * flatten :: Monad m => m m a -> m a
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
export const bind: TC.BindF<[URI], V> = (fa) => (f) => _chain(fa, f);

export const _tap = <A, B>(ma: ReadonlyArray<A>, f: (a: A) => ReadonlyArray<B>): ReadonlyArray<A> =>
   _chain(ma, (a) =>
      pipe(
         f(a),
         map(() => a)
      )
   );

export const tap = <A, B>(f: (a: A) => ReadonlyArray<B>) => (ma: ReadonlyArray<A>): ReadonlyArray<A> => _tap(ma, f);

export const chainFirst = tap;

export const _ap = <A, B>(fab: ReadonlyArray<(a: A) => B>, fa: ReadonlyArray<A>): ReadonlyArray<B> =>
   flatten(
      pipe(
         fab,
         map((f) => pipe(fa, map(f)))
      )
   );

export const ap = <A>(fa: ReadonlyArray<A>) => <B>(fab: ReadonlyArray<(a: A) => B>): ReadonlyArray<B> => _ap(fab, fa);

export const apFirst: <B>(fb: ReadonlyArray<B>) => <A>(fa: ReadonlyArray<A>) => ReadonlyArray<A> = (fb) =>
   flow(
      map((a) => () => a),
      ap(fb)
   );

export const apSecond = <B>(fb: ReadonlyArray<B>): (<A>(fa: ReadonlyArray<A>) => ReadonlyArray<B>) =>
   flow(
      map(() => (b: B) => b),
      ap(fb)
   );

/**
 * ```haskell
 * _filterWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Boolean)) -> f k a
 * ```
 */
export const _filterWithIndex: {
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
 *    ((k, a) -> Boolean) -> f k a -> f k a
 * ```
 */
export const filterWithIndex: {
   <A, B extends A>(f: RefinementWithIndex<number, A, B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B>;
   <A>(f: PredicateWithIndex<number, A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A>;
} = <A>(f: PredicateWithIndex<number, A>) => (fa: ReadonlyArray<A>): ReadonlyArray<A> => _filterWithIndex(fa, f);

/**
 * ```haskell
 * _filter :: Filterable f => (f a, (a -> Boolean)) -> f a
 * ```
 */
export const _filter: {
   <A, B extends A>(fa: ReadonlyArray<A>, f: Refinement<A, B>): ReadonlyArray<B>;
   <A>(fa: ReadonlyArray<A>, f: Predicate<A>): ReadonlyArray<A>;
} = <A>(fa: ReadonlyArray<A>, f: Predicate<A>): ReadonlyArray<A> => _filterWithIndex(fa, (_, a) => f(a));

/**
 * ```haskell
 * filter :: Filterable f => (a -> Boolean) -> f a -> f a
 * ```
 */
export const filter: {
   <A, B extends A>(f: Refinement<A, B>): (fa: ReadonlyArray<A>) => ReadonlyArray<B>;
   <A>(f: Predicate<A>): (fa: ReadonlyArray<A>) => ReadonlyArray<A>;
} = <A>(f: Predicate<A>) => (fa: ReadonlyArray<A>) => _filterWithIndex(fa, (_, a) => f(a));

/**
 * ```haskell
 * _mapMaybeWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Maybe b)) -> f k b
 * ```
 */
export const _mapMaybeWithIndex = <A, B>(fa: ReadonlyArray<A>, f: (i: number, a: A) => Maybe<B>): ReadonlyArray<B> => {
   const result = [];
   for (let i = 0; i < fa.length; i++) {
      const maybeB = f(i, fa[i]);
      if (maybeB._tag === "Just") {
         result.push(maybeB.value);
      }
   }
   return result;
};

/**
 * ```haskell
 * mapMaybeWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Maybe b) -> f k a -> f k b
 * ```
 */
export const mapMaybeWithIndex = <A, B>(f: (i: number, a: A) => Maybe<B>) => (fa: ReadonlyArray<A>): ReadonlyArray<B> =>
   _mapMaybeWithIndex(fa, f);

/**
 * ```haskell
 * _mapMaybe :: Filterable f => (f a, (a -> Maybe b)) -> f b
 * ```
 */
export const _mapMaybe = <A, B>(fa: ReadonlyArray<A>, f: (a: A) => Maybe<B>): ReadonlyArray<B> =>
   _mapMaybeWithIndex(fa, (_, a) => f(a));

/**
 * ```haskell
 * mapMaybe :: Filterable f => (a -> Maybe b) -> f a -> f b
 * ```
 */
export const mapMaybe = <A, B>(f: (a: A) => Maybe<B>) => (fa: ReadonlyArray<A>): ReadonlyArray<B> =>
   _mapMaybeWithIndex(fa, (_, a) => f(a));

export const _extend = <A, B>(wa: ReadonlyArray<A>, f: (as: ReadonlyArray<A>) => B): ReadonlyArray<B> =>
   _mapWithIndex(wa, (i, _) => f(wa.slice(i)));

/**
 * extend :: Extend w => (w a -> b) -> w a -> w b
 */
export const extend = <A, B>(f: (as: ReadonlyArray<A>) => B) => (wa: ReadonlyArray<A>): ReadonlyArray<B> =>
   _extend(wa, f);

/**
 * ```haskell
 * compact :: Compactable c => c (Maybe a) -> c a
 * ```
 */
export const compact = <A>(as: ReadonlyArray<Maybe<A>>): ReadonlyArray<A> => _mapMaybe(as, identity);

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
 * _reduceWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (t k a, b, ((k, b, a) -> b)) -> b
 * ```
 */
export const _reduceWithIndex = <A, B>(fa: ReadonlyArray<A>, b: B, f: (i: number, b: B, a: A) => B): B => {
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
 *    (b, ((k, b, a) -> b)) -> t k a -> b
 * ```
 */
export const reduceWithIndex = <A, B>(b: B, f: (i: number, b: B, a: A) => B) => (fa: ReadonlyArray<A>): B =>
   _reduceWithIndex(fa, b, f);

/**
 * ```haskell
 * _reduce :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 */
export const _reduce = <A, B>(fa: ReadonlyArray<A>, b: B, f: (b: B, a: A) => B): B =>
   _reduceWithIndex(fa, b, (_, b, a) => f(b, a));

/**
 * ```haskell
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 */
export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: ReadonlyArray<A>): B =>
   _reduceWithIndex(fa, b, (_, b, a) => f(b, a));

/**
 * ```haskell
 * _reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (t k a, b, ((k, a, b) -> b)) -> b
 * ```
 */
export const _reduceRightWithIndex = <A, B>(fa: ReadonlyArray<A>, b: B, f: (i: number, a: A, b: B) => B): B => {
   let r = b;
   for (let i = fa.length - 1; i >= 0; i--) {
      r = f(i, fa[i], r);
   }
   return r;
};

/**
 * ```haskell
 * reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, a, b) -> b)) -> t k a -> b
 * ```
 */
export const reduceRightWithIndex = <A, B>(b: B, f: (i: number, a: A, b: B) => B) => (fa: ReadonlyArray<A>): B =>
   _reduceRightWithIndex(fa, b, f);

/**
 * ```haskell
 * _reduceRight :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 */
export const _reduceRight = <A, B>(fa: ReadonlyArray<A>, b: B, f: (a: A, b: B) => B): B =>
   _reduceRightWithIndex(fa, b, (_, a, b) => f(a, b));

/**
 * ```haskell
 * reduceRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 */
export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: ReadonlyArray<A>): B => _reduceRight(fa, b, f);

export const _foldMapWithIndex = <M>(M: Monoid<M>) => <A>(fa: ReadonlyArray<A>, f: (i: number, a: A) => M): M =>
   _reduceWithIndex(fa, M.empty, (i, b, a) => M.concat(b)(f(i, a)));

export const foldMapWithIndex = <M>(M: Monoid<M>) => <A>(f: (i: number, a: A) => M) => (fa: ReadonlyArray<A>) =>
   _foldMapWithIndex(M)(fa, f);

export const _foldMap = <M>(M: Monoid<M>): (<A>(fa: ReadonlyArray<A>, f: (a: A) => M) => M) => {
   const _foldMapWithIndexM = _foldMapWithIndex(M);
   return (fa, f) => _foldMapWithIndexM(fa, (_, a) => f(a));
};

export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: ReadonlyArray<A>): M => _foldMap(M)(fa, f);

/**
 * ```haskell
 * _partitionWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Boolean)) -> Separated (f k a) (f k a)
 * ```
 */
export const _partitionWithIndex: {
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
 *    (k, a) -> Boolean) -> f k a -> Separated (f k a) (f k a)
 * ```
 */
export const partitionWithIndex: {
   <A, B extends A>(refinement: RefinementWithIndex<number, A, B>): (
      ta: ReadonlyArray<A>
   ) => Separated<ReadonlyArray<A>, ReadonlyArray<B>>;
   <A>(predicate: PredicateWithIndex<number, A>): (
      ta: ReadonlyArray<A>
   ) => Separated<ReadonlyArray<A>, ReadonlyArray<A>>;
} = <A>(predicate: PredicateWithIndex<number, A>) => (ta: ReadonlyArray<A>) => _partitionWithIndex(ta, predicate);

/**
 * ```haskell
 * _partition :: Filterable f => (f a, (a -> Boolean)) -> Separated (f a) (f a)
 * ```
 */
export const _partition: {
   <A, B extends A>(ta: ReadonlyArray<A>, refinement: Refinement<A, B>): Separated<ReadonlyArray<A>, ReadonlyArray<B>>;
   <A>(ta: ReadonlyArray<A>, predicate: Predicate<A>): Separated<ReadonlyArray<A>, ReadonlyArray<A>>;
} = <A>(ta: ReadonlyArray<A>, predicate: Predicate<A>) => _partitionWithIndex(ta, (_, a) => predicate(a));

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
} = <A>(predicate: Predicate<A>) => (ta: ReadonlyArray<A>) => _partitionWithIndex(ta, (_, a) => predicate(a));

/**
 * ```haskell
 * _mapEitherWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Either b c)) -> Separated (f k b) (f k c)
 * ```
 */
export const _mapEitherWithIndex = <A, B, C>(
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
 *    ((k, a) -> Either b c) -> f k a -> Separated (f k b) (f k c)
 * ```
 */
export const mapEitherWithIndex = <A, B, C>(f: (i: number, a: A) => Either<B, C>) => (
   ta: ReadonlyArray<A>
): Separated<ReadonlyArray<B>, ReadonlyArray<C>> => _mapEitherWithIndex(ta, f);

/**
 * ```haskell
 * _mapEither :: Filterable f => (f a, (a -> Either b c)) -> Separated (f b) (f c)
 * ```
 */
export const _mapEither: TC.UC_MapEitherF<[URI], V> = <A, B, C>(
   ta: ReadonlyArray<A>,
   f: (a: A) => Either<B, C>
): Separated<ReadonlyArray<B>, ReadonlyArray<C>> => _mapEitherWithIndex(ta, (_, a) => f(a));

/**
 * ```haskell
 * mapEither :: Filterable f => (a -> Either b c) -> f a -> Separated (f b) (f c)
 * ```
 */
export const mapEither = <A, B, C>(f: (a: A) => Either<B, C>) => (
   ta: ReadonlyArray<A>
): Separated<ReadonlyArray<B>, ReadonlyArray<C>> => _mapEitherWithIndex(ta, (_, a) => f(a));

export const _alt = <A>(fa: ReadonlyArray<A>, that: () => ReadonlyArray<A>): ReadonlyArray<A> => __append(fa, that());

export const alt = <A>(that: () => ReadonlyArray<A>) => (fa: ReadonlyArray<A>): ReadonlyArray<A> => _alt(fa, that);

/**
 * ```haskell
 * _traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g -> (t k a, ((k, a) -> g b)) -> g (t k b)
 * ```
 */
export const _traverseWithIndex: TC.UC_TraverseWithIndexF<[URI], V> = TC.implementUCTraverseWithIndex<[URI], V>()(
   (_) => (G) => (ta, f) =>
      pipe(
         ta,
         reduceWithIndex(G.pure(empty()), (i, fbs, a) =>
            pipe(
               fbs,
               G.map((bs) => (b: typeof _.B) => __snoc(b)(bs)),
               G.ap(f(i, a))
            )
         )
      )
);

/**
 * ```haskell
 * traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g -> ((k, a) -> g b) -> t k a -> g (t k b)
 * ```
 */
export const traverseWithIndex: TC.TraverseWithIndexF<[URI], V> = (A) => (f) => (ta) => _traverseWithIndex(A)(ta, f);

/**
 * ```haskell
 * _traverse :: (Applicative g, Traversable t) =>
 *    g -> (t a, (a -> g b)) -> g (t b)
 * ```
 */
export const _traverse: TC.UC_TraverseF<[URI], V> = (A) => (ta, f) => _traverseWithIndex(A)(ta, (_, a) => f(a));

/**
 * ```haskell
 * traverse :: (Applicative g, Traversable t) =>
 *    g -> (a -> g b) -> t a -> g (t b)
 * ```
 */
export const traverse: TC.TraverseF<[URI], V> = (A) => (f) => (ta) => _traverseWithIndex(A)(ta, (_, a) => f(a));

/**
 * ```haskell
 * sequence :: (Applicative g, Traversable t) => g -> t a -> g (t a)
 * ```
 */
export const sequence: TC.SequenceF<[URI], V> = TC.implementSequence<[URI], V>()((_) => (G) => (ta) =>
   pipe(
      ta,
      reduce(G.pure(empty()), (fas, fa) =>
         pipe(
            fas,
            G.map((as) => (a: typeof _.A) => __snoc(a)(as)),
            G.ap(fa)
         )
      )
   )
);

/**
 * ```haskell
 * _witherWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> (w k a, ((k, a) -> g (w k (Maybe b)))) -> g (w k b)
 * ```
 */
export const _witherWithIndex: TC.UC_WitherWithIndexF<[URI], V> = (G) => {
   const traverseG = _traverseWithIndex(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(compact));
};

/**
 * ```haskell
 * witherWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> ((k, a) -> g (w k (Maybe b))) -> w k a -> g (w k b)
 * ```
 */
export const witherWithIndex: TC.WitherWithIndexF<[URI], V> = (G) => (f) => (wa) => _witherWithIndex(G)(wa, f);

/**
 * ```haskell
 * _wither :: (Applicative g, Witherable w) =>
 *    g -> (w a, (a -> g (w (Maybe b)))) -> g (w b)
 * ```
 */
export const _wither: TC.UC_WitherF<[URI], V> = (G) => (wa, f) => _witherWithIndex(G)(wa, (_, a) => f(a));

/**
 * ```haskell
 * wither :: (Applicative g, Witherable w) =>
 *    g -> (a -> g (w (Maybe b))) -> w a -> g (w b)
 * ```
 */
export const wither: TC.WitherF<[URI], V> = (G) => (f) => (wa) => _wither(G)(wa, f);

/**
 * ```haskell
 * _wiltWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> (w k a, ((k, a) -> g (w k (Either b c)))) -> g (Separated (w k b) (w k c))
 * ```
 */
export const _wiltWithIndex: TC.UC_WiltWithIndexF<[URI], V> = (G) => {
   const traverseG = _traverseWithIndex(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(separate));
};

/**
 * ```haskell
 * wiltWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> ((k, a) -> g (w k (Either b c))) -> w k a -> g (Separated (w k b) (w k c))
 * ```
 */
export const wiltWithIndex: TC.WiltWithIndexF<[URI], V> = (G) => (f) => (wa) => _wiltWithIndex(G)(wa, f);

/**
 * ```haskell
 * _wilt :: (Applicative g, Witherable w) =>
 *    g -> (w a, (a -> g (w (Either b c)))) -> g (Separated (w b) (w c))
 * ```
 */
export const _wilt: TC.UC_WiltF<[URI], V> = (G) => (wa, f) => _wiltWithIndex(G)(wa, (_, a) => f(a));

/**
 * ```haskell
 * _wilt :: (Applicative g, Witherable w) =>
 *    g -> (a -> g (w (Either b c))) -> w a -> g (Separated (w b) (w c))
 * ```
 */
export const wilt: TC.WiltF<[URI], V> = (G) => (f) => (wa) => _wilt(G)(wa, f);

export const duplicate: <A>(wa: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>> = (wa) => _extend(wa, identity);

export const unfold = <A, B>(b: B, f: (b: B) => Maybe<readonly [A, B]>): ReadonlyArray<A> => {
   const ret = [];
   let bb = b;
   /* eslint-disable-next-line no-constant-condition */
   while (true) {
      const mt = f(bb);
      if (mt._tag === "Just") {
         const [a, b] = mt.value;
         ret.push(a);
         bb = b;
      } else {
         break;
      }
   }
   return ret;
};

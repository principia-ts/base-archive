import { Either } from "../Either";
import { pipe, Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import type * as HKT from "../HKT";
import { isJust, Maybe } from "../Maybe";
import { Monoid } from "../Monoid";
import * as TC from "../typeclass-index";
import { Separated } from "../Utils";
import { ReadonlyRecord, URI, V } from "./Record";

const keys = <N extends string>(r: ReadonlyRecord<N, unknown>): ReadonlyArray<N> => Object.keys(r) as any;

const _hasOwnProperty = Object.prototype.hasOwnProperty;

export const none: TC.NoneF<[URI], V> = () => ({} as ReadonlyRecord<string, never>);

/**
 * ```haskell
 * _mapWithIndex :: (FunctorWithIndex f, Index k) => (f k a, ((k, a) -> b)) -> f k b
 * ```
 *
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const _mapWithIndex = <N extends string, A, B>(
   fa: ReadonlyRecord<N, A>,
   f: (k: N, a: A) => B
): ReadonlyRecord<N, B> => {
   const out = {} as Record<N, B>;
   const keys = Object.keys(fa);
   for (let i = 0; i < keys.length; i++) {
      const k = keys[i] as keyof typeof fa;
      out[k] = f(k, fa[k]);
   }
   return out;
};

/**
 * ```haskell
 * _mapWithIndex :: (FunctorWithIndex f, Index k) => ((k, a) -> b) -> f k a -> f k b
 * ```
 *
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex = <N extends string, A, B>(f: (k: N, a: A) => B) => (
   fa: ReadonlyRecord<N, A>
): ReadonlyRecord<N, B> => _mapWithIndex(fa, f);

/**
 * ```haskell
 * _map :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Map a record passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const _map = <N extends string, A, B>(fa: ReadonlyRecord<N, A>, f: (a: A) => B): ReadonlyRecord<N, B> =>
   _mapWithIndex(fa, (_, a) => f(a));

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Map a record passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const map = <A, B>(f: (a: A) => B) => <N extends string>(fa: ReadonlyRecord<N, A>): ReadonlyRecord<N, B> =>
   _map(fa, f);

/**
 * ```haskell
 * _reduceWithIndex :: (FoldableWithIndex t, Index k) => (t k a, b, ((k, b, a) -> b)) -> b
 * ```
 */
export const _reduceWithIndex = <N extends string, A, B>(
   fa: ReadonlyRecord<N, A>,
   b: B,
   f: (k: N, b: B, a: A) => B
): B => {
   let out = b;
   const ks = keys(fa);
   const len = ks.length;
   for (let i = 0; i < len; i++) {
      const k = ks[i];
      out = f(k, out, fa[k]);
   }
   return out;
};

/**
 * ```haskell
 * reduceWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, b, a) -> b)) -> t k a -> b
 * ```
 */
export const reduceWithIndex = <N extends string, A, B>(b: B, f: (k: N, b: B, a: A) => B) => (
   fa: ReadonlyRecord<N, A>
): B => _reduceWithIndex(fa, b, f);

/**
 * ```haskell
 * _reduce :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 */
export const _reduce = <N extends string, A, B>(fa: ReadonlyRecord<N, A>, b: B, f: (b: B, a: A) => B): B =>
   _reduceWithIndex(fa, b, (_, acc, a) => f(acc, a));

/**
 * ```haskell
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 */
export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => <N extends string>(fa: ReadonlyRecord<N, A>): B =>
   _reduce(fa, b, f);

/**
 * ```haskell
 * _reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (t k a, b, ((k, a, b) -> b)) -> b
 * ```
 */
export const _reduceRightWithIndex = <N extends string, A, B>(
   fa: ReadonlyRecord<N, A>,
   b: B,
   f: (k: N, a: A, b: B) => B
): B => {
   let out = b;
   const ks = keys(fa);
   const len = ks.length;
   for (let i = len - 1; i >= 0; i--) {
      const k = ks[i];
      out = f(k, fa[k], out);
   }
   return out;
};

/**
 * ```haskell
 * reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (b, ((k, a, b) -> b)) -> t k a -> b
 * ```
 */
export const reduceRightWithIndex = <N extends string, A, B>(b: B, f: (k: N, a: A, b: B) => B) => (
   fa: ReadonlyRecord<N, A>
): B => _reduceRightWithIndex(fa, b, f);

/**
 * ```haskell
 * _reduceRight :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 */
export const _reduceRight = <N extends string, A, B>(fa: ReadonlyRecord<N, A>, b: B, f: (a: A, b: B) => B): B =>
   _reduceRightWithIndex(fa, b, (_, a, acc) => f(a, acc));

/**
 * ```haskell
 * reduceRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 */
export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => <N extends string>(fa: ReadonlyRecord<N, A>): B =>
   _reduceRight(fa, b, f);

/**
 * ```haskell
 * _traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g -> (t k a, ((k, a) -> g b)) -> g (t k b)
 * ```
 */
export const _traverseWithIndex: TC.UC_TraverseWithIndexF<[URI], V> = TC.implementUCTraverseWithIndex<[URI], V>()(
   (_) => (G) => (ta, f) => {
      type _ = typeof _;

      const ks = keys(ta);
      if (ks.length === 0) {
         return G.pure(none());
      }
      let gr: HKT.HKT<_["G"], Record<typeof _["N"], typeof _["B"]>> = G.pure({}) as any;
      for (let i = 0; i < ks.length; i++) {
         const key = ks[i];
         gr = pipe(
            gr,
            G.map((r) => (b: typeof _.B) => {
               r[key] = b;
               return r;
            }),
            G.ap(f(key, ta[key]))
         );
      }
      return gr;
   }
);

/**
 * ```haskell
 * traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g -> ((k, a) -> g b) -> t k a -> g (t k b)
 * ```
 */
export const traverseWithIndex: TC.TraverseWithIndexF<[URI], V> = (G) => (f) => (ta) => _traverseWithIndex(G)(ta, f);

/**
 * ```haskell
 * _traverse :: (Applicative g, Traversable t) =>
 *    g -> (t a, (a -> g b)) -> g (t b)
 * ```
 */
export const _traverse: TC.UC_TraverseF<[URI], V> = (G) => (ta, f) => _traverseWithIndex(G)(ta, (_, a) => f(a));

/**
 * ```haskell
 * traverse :: (Applicative g, Traversable t) =>
 *    g -> (a -> g b) -> t a -> g (t b)
 * ```
 */
export const traverse: TC.TraverseF<[URI], V> = (G) => (f) => (ta) => _traverse(G)(ta, f);

/**
 * ```haskell
 * sequence :: (Applicative g, Traversable t) => g -> t a -> g (t a)
 * ```
 */
export const sequence: TC.SequenceF<[URI], V> = (G) => (ta) => _traverseWithIndex(G)(ta, (_, a) => a);

/**
 * ```haskell
 * _filterWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Boolean)) -> f k a
 * ```
 */
export const _filterWithIndex: {
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
 *    ((k, a) -> Boolean) -> f k a -> f k a
 * ```
 */
export const filterWithIndex: {
   <N extends string, A, B extends A>(refinement: RefinementWithIndex<N, A, B>): (
      fa: ReadonlyRecord<N, A>
   ) => ReadonlyRecord<string, B>;
   <N extends string, A>(predicate: PredicateWithIndex<N, A>): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, A>;
} = <A>(predicate: PredicateWithIndex<string, A>) => (fa: ReadonlyRecord<string, A>) => _filterWithIndex(fa, predicate);

/**
 * ```haskell
 * _filter :: Filterable f => (f a, (a -> Boolean)) -> f a
 * ```
 */
export const _filter: {
   <N extends string, A, B extends A>(fa: ReadonlyRecord<N, A>, refinement: Refinement<A, B>): ReadonlyRecord<
      string,
      B
   >;
   <N extends string, A>(fa: ReadonlyRecord<N, A>, predicate: Predicate<A>): ReadonlyRecord<string, A>;
} = <A>(fa: ReadonlyRecord<string, A>, predicate: Predicate<A>) => _filterWithIndex(fa, (_, a) => predicate(a));

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
} = <A>(predicate: Predicate<A>) => (fa: ReadonlyRecord<string, A>) => _filter(fa, predicate);

/**
 * ```haskell
 * _mapMaybeWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Maybe b)) -> f k b
 * ```
 */
export const _mapMaybeWithIndex = <N extends string, A, B>(
   fa: ReadonlyRecord<N, A>,
   f: (k: N, a: A) => Maybe<B>
): ReadonlyRecord<string, B> => {
   const r: Record<string, B> = {} as any;
   const ks = keys(fa);
   for (let i = 0; i < ks.length; i++) {
      const key = ks[i];
      const optionB = f(key, fa[key]);
      if (optionB._tag === "Just") {
         r[key] = optionB.value;
      }
   }
   return r;
};

/**
 * ```haskell
 * mapMaybeWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Maybe b) -> f k a -> f k b
 * ```
 */
export const mapMaybeWithIndex = <N extends string, A, B>(f: (k: N, a: A) => Maybe<B>) => (
   fa: ReadonlyRecord<N, A>
): ReadonlyRecord<string, B> => _mapMaybeWithIndex(fa, f);

/**
 * ```haskell
 * _mapMaybe :: Filterable f => (f a, (a -> Maybe b)) -> f b
 * ```
 */
export const _mapMaybe = <N extends string, A, B>(
   fa: ReadonlyRecord<N, A>,
   f: (a: A) => Maybe<B>
): ReadonlyRecord<string, B> => _mapMaybeWithIndex(fa, (_, a) => f(a));

/**
 * ```haskell
 * mapMaybe :: Filterable f => (a -> Maybe b) -> f a -> f b
 * ```
 */
export const mapMaybe = <A, B>(f: (a: A) => Maybe<B>) => <N extends string>(
   fa: ReadonlyRecord<N, A>
): ReadonlyRecord<string, B> => _mapMaybe(fa, f);

export const _foldMapWithIndex = <M>(M: Monoid<M>) => <N extends string, A>(
   fa: ReadonlyRecord<N, A>,
   f: (k: N, a: A) => M
): M => {
   let out = M.empty;
   const ks = keys(fa);
   const len = ks.length;
   for (let i = 0; i < len; i++) {
      const k = ks[i];
      out = M.concat(out)(f(k, fa[k]));
   }
   return out;
};

export const foldMapWithIndex = <M>(M: Monoid<M>) => <N extends string, A>(f: (k: N, a: A) => M) => (
   fa: ReadonlyRecord<N, A>
): M => _foldMapWithIndex(M)(fa, f);

export const _foldMap = <M>(M: Monoid<M>) => <N extends string, A>(fa: ReadonlyRecord<N, A>, f: (a: A) => M): M =>
   _foldMapWithIndex(M)(fa, (_, a) => f(a));

export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => <N extends string>(fa: ReadonlyRecord<N, A>): M =>
   _foldMap(M)(fa, f);

/**
 * ```haskell
 * _partitionWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Boolean)) -> Separated (f k a) (f k a)
 * ```
 */
export const _partitionWithIndex: {
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
 *    (k, a) -> Boolean) -> f k a -> Separated (f k a) (f k a)
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
   _partitionWithIndex(fa, predicate);

/**
 * ```haskell
 * _partition :: Filterable f => (f a, (a -> Boolean)) -> Separated (f a) (f a)
 * ```
 */
export const _partition: {
   <N extends string, A, B extends A>(fa: ReadonlyRecord<N, A>, refinement: Refinement<A, B>): Separated<
      ReadonlyRecord<string, A>,
      ReadonlyRecord<string, B>
   >;
   <N extends string, A>(fa: ReadonlyRecord<N, A>, predicate: Predicate<A>): Separated<
      ReadonlyRecord<string, A>,
      ReadonlyRecord<string, A>
   >;
} = <A>(fa: ReadonlyRecord<string, A>, predicate: Predicate<A>) => _partitionWithIndex(fa, (_, a) => predicate(a));

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
} = <A>(predicate: Predicate<A>) => (fa: ReadonlyRecord<string, A>) => _partition(fa, predicate);

/**
 * ```haskell
 * _mapEitherWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Either b c)) -> Separated (f k b) (f k c)
 * ```
 */
export const _mapEitherWithIndex = <N extends string, A, B, C>(
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
 *    ((k, a) -> Either b c) -> f k a -> Separated (f k b) (f k c)
 * ```
 */
export const mapEitherWithIndex = <N extends string, A, B, C>(f: (k: N, a: A) => Either<B, C>) => (
   fa: ReadonlyRecord<N, A>
): Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> => _mapEitherWithIndex(fa, f);

/**
 * ```haskell
 * _mapEither :: Filterable f => (f a, (a -> Either b c)) -> Separated (f b) (f c)
 * ```
 */
export const _mapEither = <N extends string, A, B, C>(
   fa: ReadonlyRecord<N, A>,
   f: (a: A) => Either<B, C>
): Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> => _mapEitherWithIndex(fa, (_, a) => f(a));

/**
 * ```haskell
 * mapEither :: Filterable f => (a -> Either b c) -> f a -> Separated (f b) (f c)
 * ```
 */
export const mapEither = <A, B, C>(f: (a: A) => Either<B, C>) => <N extends string>(
   fa: ReadonlyRecord<N, A>
): Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> => _mapEither(fa, f);

/**
 * ```haskell
 * separate :: Compactable c => c (Either a b) -> Separated (c a) (c b)
 * ```
 */
export const separate = <N extends string, A, B>(fa: ReadonlyRecord<N, Either<A, B>>) => {
   const left: Record<string, A> = {} as any;
   const right: Record<string, B> = {} as any;
   const keys = Object.keys(fa);
   for (const key of keys) {
      const e = fa[key];
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
 * compact :: Compactable c => c (Maybe a) -> c a
 * ```
 */
export const compact = <N extends string, A>(fa: ReadonlyRecord<N, Maybe<A>>) => {
   const r: Record<string, A> = {} as any;
   const ks = keys(fa);
   for (const key of ks) {
      const optionA = fa[key];
      if (isJust(optionA)) {
         r[key] = optionA.value;
      }
   }
   return r;
};

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
export const _wiltWithIndex: TC.UC_WiltWithIndexF<[URI], V> = TC.implementUCWiltWithIndex<[URI], V>()(() => (G) => {
   const traverseG = _traverseWithIndex(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(separate));
});

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

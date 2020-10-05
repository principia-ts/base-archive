import { Either, InferLeft, InferRight } from "../Either";
import { pipe, Predicate, PredicateWithIndex } from "../Function";
import type * as HKT from "../HKT";
import { InferJust, isJust, Maybe } from "../Maybe";
import * as TC from "../typeclass-index";
import { ReadonlyRecord, URI, V } from "./Record";

const keys = <N extends string>(r: ReadonlyRecord<N, unknown>): ReadonlyArray<N> =>
   Object.keys(r) as any;

const _hasOwnProperty = Object.prototype.hasOwnProperty;

export const none: TC.NoneF<[URI], V> = () => ({} as ReadonlyRecord<string, never>);

/**
 * ```haskell
 * _mapWithIndex :: (FunctorWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> b)) -> f k b
 * ```
 *
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const _mapWithIndex: TC.UC_MapWithIndexF<[URI], V> = (fa, f) => {
   const out = {} as Record<keyof typeof fa, ReturnType<typeof f>>;
   const keys = Object.keys(fa);
   for (let i = 0; i < keys.length; i++) {
      const k = keys[i] as keyof typeof fa;
      out[k] = f(k, fa[k]);
   }
   return out;
};

/**
 * ```haskell
 * _mapWithIndex :: (FunctorWithIndex f, Index k) =>
 *    ((k, a) -> b) -> f k a -> f k b
 * ```
 *
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex: TC.MapWithIndexF<[URI], V> = (f) => (fa) => _mapWithIndex(fa, f);

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
export const _map: TC.UC_MapF<[URI], V> = (fa, f) => _mapWithIndex(fa, (_, a) => f(a));

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
export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

/**
 * ```haskell
 * _reduceWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (t k a, b, ((k, b, a) -> b)) -> b
 * ```
 */
export const _reduceWithIndex: TC.UC_ReduceWithIndexF<[URI], V> = (fa, b, f) => {
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
export const reduceWithIndex: TC.ReduceWithIndexF<[URI], V> = (b, f) => (fa) =>
   _reduceWithIndex(fa, b, f);

/**
 * ```haskell
 * _reduce :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 */
export const _reduce: TC.UC_ReduceF<[URI], V> = (fa, b, f) =>
   _reduceWithIndex(fa, b, (_, acc, a) => f(acc, a));

/**
 * ```haskell
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 */
export const reduce: TC.ReduceF<[URI], V> = (b, f) => (fa) => _reduce(fa, b, f);

/**
 * ```haskell
 * _reduceRightWithIndex :: (FoldableWithIndex t, Index k) =>
 *    (t k a, b, ((k, a, b) -> b)) -> b
 * ```
 */
export const _reduceRightWithIndex: TC.UC_ReduceRightWithIndexF<[URI], V> = (fa, b, f) => {
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
export const reduceRightWithIndex: TC.ReduceRightWithIndexF<[URI], V> = (b, f) => (fa) =>
   _reduceRightWithIndex(fa, b, f);

/**
 * ```haskell
 * _reduceRight :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 */
export const _reduceRight: TC.UC_ReduceRightF<[URI], V> = (fa, b, f) =>
   _reduceRightWithIndex(fa, b, (_, a, acc) => f(a, acc));

/**
 * ```haskell
 * reduceRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 */
export const reduceRight: TC.ReduceRightF<[URI], V> = (b, f) => (fa) => _reduceRight(fa, b, f);

/**
 * ```haskell
 * _traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g -> (t k a, ((k, a) -> g b)) -> g (t k b)
 * ```
 */
export const _traverseWithIndex: TC.UC_TraverseWithIndexF<
   [URI],
   V
> = TC.implementUCTraverseWithIndex<[URI], V>()((_) => (G) => (ta, f) => {
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
});

/**
 * ```haskell
 * traverseWithIndex :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g -> ((k, a) -> g b) -> t k a -> g (t k b)
 * ```
 */
export const traverseWithIndex: TC.TraverseWithIndexF<[URI], V> = (G) => (f) => (ta) =>
   _traverseWithIndex(G)(ta, f);

/**
 * ```haskell
 * _traverse :: (Applicative g, Traversable t) =>
 *    g -> (t a, (a -> g b)) -> g (t b)
 * ```
 */
export const _traverse: TC.UC_TraverseF<[URI], V> = (G) => (ta, f) =>
   _traverseWithIndex(G)(ta, (_, a) => f(a));

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
export const sequence: TC.SequenceF<[URI], V> = (G) => (ta) =>
   _traverseWithIndex(G)(ta, (_, a) => a);

/**
 * ```haskell
 * _filterWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Boolean)) -> f k a
 * ```
 */
export const _filterWithIndex: TC.UC_FilterWithIndexF<[URI], V> = <A>(
   fa: ReadonlyRecord<string, A>,
   predicate: PredicateWithIndex<string, A>
) => {
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
export const filterWithIndex: TC.FilterWithIndexF<[URI], V> = <A>(
   predicate: PredicateWithIndex<string, A>
) => (fa: ReadonlyRecord<string, A>) => _filterWithIndex(fa, predicate);

/**
 * ```haskell
 * _filter :: Filterable f => (f a, (a -> Boolean)) -> f a
 * ```
 */
export const _filter: TC.UC_FilterF<[URI], V> = <A>(
   fa: ReadonlyRecord<string, A>,
   predicate: Predicate<A>
) => _filterWithIndex(fa, (_, a) => predicate(a));

/**
 * ```haskell
 * filter :: Filterable f => (a -> Boolean) -> f a -> f a
 * ```
 */
export const filter: TC.FilterF<[URI], V> = <A>(predicate: Predicate<A>) => (
   fa: ReadonlyRecord<string, A>
) => _filter(fa, predicate);

/**
 * ```haskell
 * _filterMapWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Maybe b)) -> f k b
 * ```
 */
export const _mapMaybeWithIndex: TC.UC_MapMaybeWithIndexF<[URI], V> = (fa, f) => {
   const r: Record<keyof typeof fa, InferJust<ReturnType<typeof f>>> = {} as any;
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
 * filterMapWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Maybe b) -> f k a -> f k b
 * ```
 */
export const mapMaybeWithIndex: TC.MapMaybeWithIndexF<[URI], V> = (f) => (fa) =>
   _mapMaybeWithIndex(fa, f);

/**
 * ```haskell
 * _filterMap :: Filterable f => (f a, (a -> Maybe b)) -> f b
 * ```
 */
export const _mapMaybe: TC.UC_MapMaybeF<[URI], V> = (fa, f) =>
   _mapMaybeWithIndex(fa, (_, a) => f(a));

/**
 * ```haskell
 * filterMap :: Filterable f => (a -> Maybe b) -> f a -> f b
 * ```
 */
export const mapMaybe: TC.MapMaybeF<[URI], V> = (f) => (fa) => _mapMaybe(fa, f);

export const _foldMapWithIndex: TC.UC_FoldMapWithIndexF<[URI], V> = (M) => (fa, f) => {
   let out = M.empty;
   const ks = keys(fa);
   const len = ks.length;
   for (let i = 0; i < len; i++) {
      const k = ks[i];
      out = M.concat(out)(f(k, fa[k]));
   }
   return out;
};

export const foldMapWithIndex: TC.FoldMapWithIndexF<[URI], V> = (M) => (f) => (fa) =>
   _foldMapWithIndex(M)(fa, f);

export const _foldMap: TC.UC_FoldMapF<[URI], V> = (M) => (fa, f) =>
   _foldMapWithIndex(M)(fa, (_, a) => f(a));

export const foldMap: TC.FoldMapF<[URI], V> = (M) => (f) => (fa) => _foldMap(M)(fa, f);

/**
 * ```haskell
 * _partitionWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Boolean)) -> Separated (f k a) (f k a)
 * ```
 */
export const _partitionWithIndex: TC.UC_PartitionWithIndexF<[URI], V> = <A>(
   fa: ReadonlyRecord<string, A>,
   predicate: PredicateWithIndex<string, A>
) => {
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
export const partitionWithIndex: TC.PartitionWithIndexF<[URI], V> = <A>(
   predicate: PredicateWithIndex<string, A>
) => (fa: ReadonlyRecord<string, A>) => _partitionWithIndex(fa, predicate);

/**
 * ```haskell
 * _partition :: Filterable f => (f a, (a -> Boolean)) -> Separated (f a) (f a)
 * ```
 */
export const _partition: TC.UC_PartitionF<[URI], V> = <A>(
   fa: ReadonlyRecord<string, A>,
   predicate: Predicate<A>
) => _partitionWithIndex(fa, (_, a) => predicate(a));

/**
 * ```haskell
 * partition :: Filterable f => (a -> Boolean) -> f a -> Separated (f a) (f a)
 * ```
 */
export const partition: TC.PartitionF<[URI], V> = <A>(predicate: Predicate<A>) => (
   fa: ReadonlyRecord<string, A>
) => _partition(fa, predicate);

/**
 * ```haskell
 * _partitionMapWithIndex :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Either b c)) -> Separated (f k b) (f k c)
 * ```
 */
export const _mapEitherWithIndex: TC.UC_MapEitherWithIndexF<[URI], V> = (fa, f) => {
   const left: Record<keyof typeof fa, InferLeft<ReturnType<typeof f>>> = {} as any;
   const right: Record<keyof typeof fa, InferRight<ReturnType<typeof f>>> = {} as any;
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
 * partitionMapWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Either b c) -> f k a -> Separated (f k b) (f k c)
 * ```
 */
export const mapEitherWithIndex: TC.MapEitherWithIndexF<[URI], V> = (f) => (fa) =>
   _mapEitherWithIndex(fa, f);

/**
 * ```haskell
 * _partitionMap :: Filterable f => (f a, (a -> Either b c)) -> Separated (f b) (f c)
 * ```
 */
export const _mapEither: TC.UC_MapEitherF<[URI], V> = (fa, f) =>
   _mapEitherWithIndex(fa, (_, a) => f(a));

/**
 * ```haskell
 * partitionMap :: Filterable f => (a -> Either b c) -> f a -> Separated (f b) (f c)
 * ```
 */
export const mapEither: TC.MapEitherF<[URI], V> = (f) => (fa) => _mapEither(fa, f);

/**
 * ```haskell
 * separate :: Compactable c => c (Either a b) -> Separated (c a) (c b)
 * ```
 */
export const separate: TC.SeparateF<[URI], V> = <N extends string, A, B>(
   fa: ReadonlyRecord<N, Either<A, B>>
) => {
   const left: Record<N, A> = {} as any;
   const right: Record<N, B> = {} as any;
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
export const compact: TC.CompactF<[URI], V> = <N extends string, A>(
   fa: ReadonlyRecord<N, Maybe<A>>
) => {
   const r: Record<N, A> = {} as any;
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
export const witherWithIndex: TC.WitherWithIndexF<[URI], V> = (G) => (f) => (wa) =>
   _witherWithIndex(G)(wa, f);

/**
 * ```haskell
 * _wither :: (Applicative g, Witherable w) =>
 *    g -> (w a, (a -> g (w (Maybe b)))) -> g (w b)
 * ```
 */
export const _wither: TC.UC_WitherF<[URI], V> = (G) => (wa, f) =>
   _witherWithIndex(G)(wa, (_, a) => f(a));

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
export const _wiltWithIndex: TC.UC_WiltWithIndexF<[URI], V> = TC.implementUCWiltWithIndex<
   [URI],
   V
>()(() => (G) => {
   const traverseG = _traverseWithIndex(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(separate));
});

/**
 * ```haskell
 * wiltWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> ((k, a) -> g (w k (Either b c))) -> w k a -> g (Separated (w k b) (w k c))
 * ```
 */
export const wiltWithIndex: TC.WiltWithIndexF<[URI], V> = (G) => (f) => (wa) =>
   _wiltWithIndex(G)(wa, f);

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

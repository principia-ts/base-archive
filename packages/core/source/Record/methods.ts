import * as TC from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";
import type { Monoid } from "@principia/prelude/Monoid";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import { pipe } from "../Function";
import type { Option } from "../Option";
import { isSome } from "../Option";
import { empty } from "./constructors";
import type { ReadonlyRecord, URI, V } from "./model";

const keys = <N extends string>(r: ReadonlyRecord<N, unknown>): ReadonlyArray<N> => Object.keys(r) as any;

const _hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * ```haskell
 * mapWithIndex_ :: (FunctorWithIndex f, Index k) => (f k a, ((k, a) -> b)) -> f k b
 * ```
 *
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex_ = <N extends string, A, B>(
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
 * mapWithIndex_ :: (FunctorWithIndex f, Index k) => ((k, a) -> b) -> f k a -> f k b
 * ```
 *
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const mapWithIndex = <N extends string, A, B>(f: (k: N, a: A) => B) => (
   fa: ReadonlyRecord<N, A>
): ReadonlyRecord<N, B> => mapWithIndex_(fa, f);

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Map a record passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export const map_ = <N extends string, A, B>(fa: ReadonlyRecord<N, A>, f: (a: A) => B): ReadonlyRecord<N, B> =>
   mapWithIndex_(fa, (_, a) => f(a));

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
   map_(fa, f);

/**
 * ```haskell
 * reduceWithIndex_ :: (FoldableWithIndex t, Index k) => (t k a, b, ((k, b, a) -> b)) -> b
 * ```
 */
export const reduceWithIndex_ = <N extends string, A, B>(
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
): B => reduceWithIndex_(fa, b, f);

/**
 * ```haskell
 * reduce_ :: Foldable t => (t a, b, ((b, a) -> b)) -> b
 * ```
 */
export const reduce_ = <N extends string, A, B>(fa: ReadonlyRecord<N, A>, b: B, f: (b: B, a: A) => B): B =>
   reduceWithIndex_(fa, b, (_, acc, a) => f(acc, a));

/**
 * ```haskell
 * reduce :: Foldable t => (b, ((b, a) -> b)) -> t a -> b
 * ```
 */
export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => <N extends string>(fa: ReadonlyRecord<N, A>): B =>
   reduce_(fa, b, f);

/**
 * ```haskell
 * reduceRightWithIndex_ :: (FoldableWithIndex t, Index k) =>
 *    (t k a, b, ((k, a, b) -> b)) -> b
 * ```
 */
export const reduceRightWithIndex_ = <N extends string, A, B>(
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
): B => reduceRightWithIndex_(fa, b, f);

/**
 * ```haskell
 * reduceRight_ :: Foldable t => (t a, b, ((a, b) -> b)) -> b
 * ```
 */
export const reduceRight_ = <N extends string, A, B>(fa: ReadonlyRecord<N, A>, b: B, f: (a: A, b: B) => B): B =>
   reduceRightWithIndex_(fa, b, (_, a, acc) => f(a, acc));

/**
 * ```haskell
 * reduceRight :: Foldable t => (b, ((a, b) -> b)) -> t a -> b
 * ```
 */
export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => <N extends string>(fa: ReadonlyRecord<N, A>): B =>
   reduceRight_(fa, b, f);

/**
 * ```haskell
 * traverseWithIndex_ :: (Applicative g, TraversableWithIndex t, Index k) =>
 *    g -> (t k a, ((k, a) -> g b)) -> g (t k b)
 * ```
 */
export const traverseWithIndex_: TC.TraverseWithIndexFn_<[URI], V> = TC.implementTraverseWithIndex_<[URI], V>()(
   (_) => (G) => (ta, f) => {
      type _ = typeof _;

      const ks = keys(ta);
      if (ks.length === 0) {
         return G.map_(G.unit(), () => empty);
      }
      let gr: HKT.HKT<_["G"], Record<typeof _["N"], typeof _["B"]>> = G.map_(G.unit(), () => ({})) as any;
      for (let i = 0; i < ks.length; i++) {
         const key = ks[i];
         gr = pipe(
            gr,
            G.both(f(key, ta[key])),
            G.map(([r, b]) => {
               r[key] = b;
               return r;
            })
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
export const traverseWithIndex: TC.TraverseWithIndexFn<[URI], V> = (G) => (f) => (ta) => traverseWithIndex_(G)(ta, f);

/**
 * ```haskell
 * traverse_ :: (Applicative g, Traversable t) =>
 *    g -> (t a, (a -> g b)) -> g (t b)
 * ```
 */
export const traverse_: TC.TraverseFn_<[URI], V> = (G) => (ta, f) => traverseWithIndex_(G)(ta, (_, a) => f(a));

/**
 * ```haskell
 * traverse :: (Applicative g, Traversable t) =>
 *    g -> (a -> g b) -> t a -> g (t b)
 * ```
 */
export const traverse: TC.TraverseFn<[URI], V> = (G) => (f) => (ta) => traverse_(G)(ta, f);

/**
 * ```haskell
 * sequence :: (Applicative g, Traversable t) => g -> t a -> g (t a)
 * ```
 */
export const sequence: TC.SequenceFn<[URI], V> = (G) => (ta) => traverseWithIndex_(G)(ta, (_, a) => a);

/**
 * ```haskell
 * filterWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Boolean)) -> f k a
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
 *    ((k, a) -> Boolean) -> f k a -> f k a
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
 * mapMaybeWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Maybe b)) -> f k b
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
 * mapMaybeWithIndex :: (FilterableWithIndex f, Index k) =>
 *    ((k, a) -> Maybe b) -> f k a -> f k b
 * ```
 */
export const mapOptionWithIndex = <N extends string, A, B>(f: (k: N, a: A) => Option<B>) => (
   fa: ReadonlyRecord<N, A>
): ReadonlyRecord<string, B> => mapOptionWithIndex_(fa, f);

/**
 * ```haskell
 * mapMaybe_ :: Filterable f => (f a, (a -> Maybe b)) -> f b
 * ```
 */
export const mapOption_ = <N extends string, A, B>(
   fa: ReadonlyRecord<N, A>,
   f: (a: A) => Option<B>
): ReadonlyRecord<string, B> => mapOptionWithIndex_(fa, (_, a) => f(a));

/**
 * ```haskell
 * mapMaybe :: Filterable f => (a -> Maybe b) -> f a -> f b
 * ```
 */
export const mapOption = <A, B>(f: (a: A) => Option<B>) => <N extends string>(
   fa: ReadonlyRecord<N, A>
): ReadonlyRecord<string, B> => mapOption_(fa, f);

export const foldMapWithIndex_ = <M>(M: Monoid<M>) => <N extends string, A>(
   fa: ReadonlyRecord<N, A>,
   f: (k: N, a: A) => M
): M => {
   let out = M.nat;
   const ks = keys(fa);
   const len = ks.length;
   for (let i = 0; i < len; i++) {
      const k = ks[i];
      out = M.combine_(out, f(k, fa[k]));
   }
   return out;
};

export const foldMapWithIndex = <M>(M: Monoid<M>) => <N extends string, A>(f: (k: N, a: A) => M) => (
   fa: ReadonlyRecord<N, A>
): M => foldMapWithIndex_(M)(fa, f);

export const foldMap_ = <M>(M: Monoid<M>) => <N extends string, A>(fa: ReadonlyRecord<N, A>, f: (a: A) => M): M =>
   foldMapWithIndex_(M)(fa, (_, a) => f(a));

export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => <N extends string>(fa: ReadonlyRecord<N, A>): M =>
   foldMap_(M)(fa, f);

/**
 * ```haskell
 * partitionWithIndex_ :: (FilterableWithIndex f, Index k) =>
 *    (f k a, ((k, a) -> Boolean)) -> Separated (f k a) (f k a)
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
 *    (f k a, ((k, a) -> Either b c)) -> Separated (f k b) (f k c)
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
 *    ((k, a) -> Either b c) -> f k a -> Separated (f k b) (f k c)
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
      switch (e.tag_) {
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
export const compact = <N extends string, A>(fa: ReadonlyRecord<N, Option<A>>) => {
   const r: Record<string, A> = {} as any;
   const ks = keys(fa);
   for (const key of ks) {
      const optionA = fa[key];
      if (isSome(optionA)) {
         r[key] = optionA.value;
      }
   }
   return r;
};

/**
 * ```haskell
 * witherWithIndex_ :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> (w k a, ((k, a) -> g (w k (Maybe b)))) -> g (w k b)
 * ```
 */
export const witherWithIndex_: TC.WitherWithIndexFn_<[URI], V> = (G) => {
   const traverseG = traverseWithIndex_(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(compact));
};

/**
 * ```haskell
 * witherWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> ((k, a) -> g (w k (Maybe b))) -> w k a -> g (w k b)
 * ```
 */
export const witherWithIndex: TC.WitherWithIndexFn<[URI], V> = (G) => (f) => (wa) => witherWithIndex_(G)(wa, f);

/**
 * ```haskell
 * wither_ :: (Applicative g, Witherable w) =>
 *    g -> (w a, (a -> g (w (Maybe b)))) -> g (w b)
 * ```
 */
export const wither_: TC.WitherFn_<[URI], V> = (G) => (wa, f) => witherWithIndex_(G)(wa, (_, a) => f(a));

/**
 * ```haskell
 * wither :: (Applicative g, Witherable w) =>
 *    g -> (a -> g (w (Maybe b))) -> w a -> g (w b)
 * ```
 */
export const wither: TC.WitherFn<[URI], V> = (G) => (f) => (wa) => wither_(G)(wa, f);

/**
 * ```haskell
 * wiltWithIndex_ :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> (w k a, ((k, a) -> g (w k (Either b c)))) -> g (Separated (w k b) (w k c))
 * ```
 */
export const wiltWithIndex_: TC.WiltWithIndexFn_<[URI], V> = TC.implementWiltWithIndex_<[URI], V>()(() => (G) => {
   const traverseG = traverseWithIndex_(G);
   return (wa, f) => pipe(traverseG(wa, f), G.map(separate));
});

/**
 * ```haskell
 * wiltWithIndex :: (Applicative g, WitherableWithIndex w, Index k) =>
 *    g -> ((k, a) -> g (w k (Either b c))) -> w k a -> g (Separated (w k b) (w k c))
 * ```
 */
export const wiltWithIndex: TC.WiltWithIndexFn<[URI], V> = (G) => (f) => (wa) => wiltWithIndex_(G)(wa, f);

/**
 * ```haskell
 * wilt_ :: (Applicative g, Witherable w) =>
 *    g -> (w a, (a -> g (w (Either b c)))) -> g (Separated (w b) (w c))
 * ```
 */
export const wilt_: TC.WiltFn_<[URI], V> = (G) => (wa, f) => wiltWithIndex_(G)(wa, (_, a) => f(a));

/**
 * ```haskell
 * wilt_ :: (Applicative g, Witherable w) =>
 *    g -> (a -> g (w (Either b c))) -> w a -> g (Separated (w b) (w c))
 * ```
 */
export const wilt: TC.WiltFn<[URI], V> = (G) => (f) => (wa) => wilt_(G)(wa, f);

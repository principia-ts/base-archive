import { deriveMapN } from "../Apply";
import type { Eq } from "../Eq";
import type { Predicate } from "../Function";
import { identity, pipe } from "../Function";
import * as HKT from "../HKT";
import type { Show } from "../Show";
import * as TC from "../typeclass-index";
import type { Separated } from "../Utils";
import { left, right } from "./constructors";
import type { Either, URI, V } from "./Either";
import { isLeft, isRight } from "./guards";
import {
   alt,
   alt_,
   ap,
   ap_,
   bimap,
   bimap_,
   chain,
   chain_,
   extend,
   first,
   first_,
   flatten,
   foldMap,
   foldMap_,
   map,
   map_,
   mapBoth,
   mapBoth_,
   pure,
   reduce,
   reduce_,
   reduceRight,
   reduceRight_,
   sequence,
   traverse,
   traverse_
} from "./methods";

/*
 * -------------------------------------------
 * Either Typeclass Instances
 * -------------------------------------------
 */

/**
 * ```haskell
 * getEq :: (Eq e, Eq a) -> Eq (Either a e)
 * ```
 *
 * @category Instances
 * @since 1.0.0
 */
export const getEq = <E, A>(eqE: Eq<E>, eqA: Eq<A>): Eq<Either<E, A>> => ({
   equals: (x) => (y) =>
      x === y || (isLeft(x) ? isLeft(y) && eqE.equals(x.left)(y.left) : isRight(y) && eqA.equals(x.right)(y.right))
});

/**
 * ```haskell
 * getShow :: (Show e, Show a) -> Show (Either e a)
 * ```
 *
 * @category Instances
 * @since 1.0.0
 */
export const getShow = <E, A>(showE: Show<E>, showA: Show<A>): Show<Either<E, A>> => ({
   show: (fa) => (isLeft(fa) ? `left(${showE.show(fa.left)})` : `right(${showA.show(fa.right)})`)
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: TC.Functor<[URI], V> = HKT.instance({
   map,
   map_
});

export const Apply: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap,
   ap_,
   mapBoth,
   mapBoth_
});

export const sequenceT = TC.sequenceT(Apply);

export const mapN: TC.MapNF<[URI], V> = deriveMapN(Apply);

export const tuple: TC.TupleF<[URI], V> = mapN(identity);

export const sequenceS = TC.sequenceS(Apply);

/**
 * @category Instances
 * @since 1.0.0
 */
export const Applicative: TC.Applicative<[URI], V> = HKT.instance({
   ...Apply,
   pure
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Monad: TC.Monad<[URI], V> = HKT.instance({
   ...Applicative,
   flatten,
   chain_,
   chain
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Foldable: TC.Foldable<[URI], V> = HKT.instance({
   reduce_,
   foldMap_,
   reduceRight_,
   reduce,
   foldMap,
   reduceRight
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Traversable: TC.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   ...Foldable,
   traverse_,
   sequence,
   traverse
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: TC.Bifunctor<[URI], V> = HKT.instance({
   bimap_,
   bimap,
   first_,
   first,
   second_: map_,
   second: map
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Alt: TC.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_,
   alt
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Extend: TC.Extend<[URI], V> = HKT.instance({
   ...Functor,
   extend
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const MonadFail: TC.MonadFail<[URI], V> = HKT.instance({
   ...Monad,
   fail: left
});

export const Do: TC.Do<[URI], V> = TC.deriveDo(Monad);

/**
 * ```haskell
 * getSemigroup :: <e, a>Semigroup a -> Semigroup (Either e a)
 * ```
 *
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are
 * concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getSemigroup = <E, A>(S: TC.Semigroup<A>): TC.Semigroup<Either<E, A>> => ({
   concat: (y) => (x) => (isLeft(y) ? x : isLeft(x) ? y : right(S.concat(y.right)(x.right)))
});

/**
 * ```haskell
 * getApplySemigroup :: <e, a>Semigroup a -> Semigroup (Either e a)
 * ```
 *
 * Semigroup returning the left-most `Left` value. If both operands are `Right`s then the inner values
 * are concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getApplySemigroup = <E, A>(S: TC.Semigroup<A>): TC.Semigroup<Either<E, A>> => ({
   concat: (y) => (x) => (isLeft(y) ? y : isLeft(x) ? x : right(S.concat(y.right)(x.right)))
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplyMonoid = <E, A>(M: TC.Monoid<A>): TC.Monoid<Either<E, A>> => ({
   ...getApplySemigroup<E, A>(M),
   empty: right(M.empty)
});

/**
 * ```haskell
 * getFilterable :: Monoid e -> Filterable (Either e _)
 * ```
 *
 * Builds a `Filterable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export const getFilterable = <E>(M: TC.Monoid<E>): TC.Filterable<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const empty = left(M.empty);

   const compact: TC.CompactF<[URI], V_> = (fa) => {
      return isLeft(fa) ? fa : fa.right._tag === "None" ? empty : right(fa.right.value);
   };

   const separate: TC.SeparateF<[URI], V_> = (fa) => {
      return isLeft(fa)
         ? { left: fa, right: fa }
         : isLeft(fa.right)
         ? { left: right(fa.right.left), right: empty }
         : { left: empty, right: right(fa.right.right) };
   };

   const mapEither_: TC.UC_MapEitherF<[URI], V_> = (fa, f) => {
      if (isLeft(fa)) {
         return { left: fa, right: fa };
      }
      const e = f(fa.right);
      return isLeft(e) ? { left: right(e.left), right: empty } : { left: empty, right: right(e.right) };
   };

   const partition_: TC.UC_PartitionF<[URI], V_> = <A>(
      fa: Either<E, A>,
      predicate: Predicate<A>
   ): Separated<Either<E, A>, Either<E, A>> => {
      return isLeft(fa)
         ? { left: fa, right: fa }
         : predicate(fa.right)
         ? { left: empty, right: right(fa.right) }
         : { left: right(fa.right), right: empty };
   };

   const mapOption_: TC.UC_MapOptionF<[URI], V_> = (fa, f) => {
      if (isLeft(fa)) {
         return fa;
      }
      const ob = f(fa.right);
      return ob._tag === "None" ? empty : right(ob.value);
   };

   const filter_: TC.UC_FilterF<[URI], V_> = <A>(fa: Either<E, A>, predicate: Predicate<A>): Either<E, A> =>
      isLeft(fa) ? fa : predicate(fa.right) ? fa : empty;

   return HKT.instance<TC.Filterable<[URI], V_>>({
      ...Functor,
      compact,
      separate,
      filter_: filter_,
      mapOption_: mapOption_,
      partition_: partition_,
      mapEither_: mapEither_,
      filter: <A>(predicate: Predicate<A>) => (fa: Either<E, A>) => filter_(fa, predicate),
      mapOption: (f) => (fa) => mapOption_(fa, f),
      partition: <A>(predicate: Predicate<A>) => (fa: Either<E, A>) => partition_(fa, predicate),
      mapEither: (f) => (fa) => mapEither_(fa, f)
   });
};

/**
 * ```haskell
 * getWitherable :: Monoid e -> Witherable (Either e _)
 * ```
 *
 * Builds a `Witherable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export const getWitherable = <E>(M: TC.Monoid<E>): TC.Witherable<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const Filterable = getFilterable(M);

   const wither_: TC.UC_WitherF<[URI], V_> = (G) => (wa, f) => {
      const traverseF = traverse_(G);
      return pipe(traverseF(wa, f), G.map(Filterable.compact));
   };

   const wilt_: TC.UC_WiltF<[URI], V_> = (G) => (wa, f) => {
      const traverseF = traverse_(G);
      return pipe(traverseF(wa, f), G.map(Filterable.separate));
   };

   return HKT.instance<TC.Witherable<[URI], V_>>({
      ...Functor,
      ...Filterable,
      ...Traversable,
      ...Foldable,
      wither_: wither_,
      wilt_: wilt_,
      wither: (G) => (f) => (wa) => wither_(G)(wa, f),
      wilt: (G) => (f) => (wa) => wilt_(G)(wa, f)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplicativeValidation = <E>(S: TC.Semigroup<E>): TC.Applicative<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const apV: TC.ApF<[URI], V_> = (fa) => (fab) =>
      isLeft(fab)
         ? isLeft(fa)
            ? left(S.concat(fa.left)(fab.left))
            : fab
         : isLeft(fa)
         ? fa
         : right(fab.right(fa.right));

   const mapBothV: TC.MapBothF<[URI], V_> = (fb, f) => (fa) =>
      isLeft(fa)
         ? isLeft(fb)
            ? left(S.concat(fa.left)(fb.left))
            : fa
         : isLeft(fb)
         ? fb
         : right(f(fa.right, fb.right));

   return HKT.instance({
      ...Functor,
      ap: apV,
      ap_: (fab, fa) => pipe(fab, apV(fa)),
      pure,
      mapBoth: mapBothV,
      mapBoth_: (fa, fb, f) => pipe(fa, mapBothV(fb, f))
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getAltValidation = <E>(S: TC.Semigroup<E>): TC.Alt<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const altV_: TC.UC_AltF<[URI], V_> = (fa, that) => {
      if (isRight(fa)) {
         return fa;
      }
      const ea = that();
      return isLeft(ea) ? left(S.concat(fa.left)(ea.left)) : ea;
   };

   return HKT.instance<TC.Alt<[URI], V_>>({
      ...Functor,
      alt_: altV_,
      alt: (that) => (fa) => altV_(fa, that)
   });
};

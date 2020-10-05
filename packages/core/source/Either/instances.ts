import { Eq } from "../Eq";
import { pipe, Predicate } from "../Function";
import * as HKT from "../HKT";
import { Show } from "../Show";
import type * as TC from "../typeclass-index";
import type { Separated } from "../Utils";
import { left, right } from "./constructors";
import { apS, bindS, bindToS, letS } from "./do";
import type { Either, URI, V } from "./Either";
import { isLeft, isRight } from "./guards";
import {
   _alt,
   _ap,
   _bimap,
   _chain,
   _first,
   _foldMap,
   _map,
   _mapBoth,
   _reduce,
   _reduceRight,
   _traverse,
   alt,
   any,
   ap,
   bimap,
   chain,
   extend,
   first,
   foldMap,
   map,
   mapBoth,
   pure,
   reduce,
   reduceRight,
   sequence,
   traverse
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
      x === y ||
      (isLeft(x)
         ? isLeft(y) && eqE.equals(x.left)(y.left)
         : isRight(y) && eqA.equals(x.right)(y.right))
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
   _map
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Applicative: TC.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   ap,
   _ap,
   pure,
   any,
   mapBoth,
   _mapBoth
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Monad: TC.Monad<[URI], V> = HKT.instance({
   ...Applicative,
   _chain,
   chain
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Foldable: TC.Foldable<[URI], V> = HKT.instance({
   _reduce,
   _foldMap,
   _reduceRight,
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
   _traverse,
   sequence,
   traverse
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: TC.Bifunctor<[URI], V> = HKT.instance({
   _bimap,
   bimap,
   _first,
   first,
   _second: _map,
   second: map
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Alt: TC.Alt<[URI], V> = HKT.instance({
   ...Functor,
   _alt,
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
export const ApplicativeDo: TC.ApplicativeDo<[URI], V> = HKT.instance({
   ...Applicative,
   bindS,
   letS,
   apS,
   bindToS
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const MonadFail: TC.MonadFail<[URI], V> = HKT.instance({
   ...Monad,
   fail: left
});

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
      return isLeft(fa) ? fa : fa.right._tag === "Nothing" ? empty : right(fa.right.value);
   };

   const separate: TC.SeparateF<[URI], V_> = (fa) => {
      return isLeft(fa)
         ? { left: fa, right: fa }
         : isLeft(fa.right)
         ? { left: right(fa.right.left), right: empty }
         : { left: empty, right: right(fa.right.right) };
   };

   const _mapEither: TC.UC_MapEitherF<[URI], V_> = (fa, f) => {
      if (isLeft(fa)) {
         return { left: fa, right: fa };
      }
      const e = f(fa.right);
      return isLeft(e)
         ? { left: right(e.left), right: empty }
         : { left: empty, right: right(e.right) };
   };

   const _partition: TC.UC_PartitionF<[URI], V_> = <A>(
      fa: Either<E, A>,
      predicate: Predicate<A>
   ): Separated<Either<E, A>, Either<E, A>> => {
      return isLeft(fa)
         ? { left: fa, right: fa }
         : predicate(fa.right)
         ? { left: empty, right: right(fa.right) }
         : { left: right(fa.right), right: empty };
   };

   const _mapMaybe: TC.UC_MapMaybeF<[URI], V_> = (fa, f) => {
      if (isLeft(fa)) {
         return fa;
      }
      const ob = f(fa.right);
      return ob._tag === "Nothing" ? empty : right(ob.value);
   };

   const _filter: TC.UC_FilterF<[URI], V_> = <A>(
      fa: Either<E, A>,
      predicate: Predicate<A>
   ): Either<E, A> => (isLeft(fa) ? fa : predicate(fa.right) ? fa : empty);

   return HKT.instance<TC.Filterable<[URI], V_>>({
      ...Functor,
      compact,
      separate,
      _filter,
      _mapMaybe,
      _partition,
      _mapEither,
      filter: <A>(predicate: Predicate<A>) => (fa: Either<E, A>) => _filter(fa, predicate),
      mapMaybe: (f) => (fa) => _mapMaybe(fa, f),
      partition: <A>(predicate: Predicate<A>) => (fa: Either<E, A>) => _partition(fa, predicate),
      mapEither: (f) => (fa) => _mapEither(fa, f)
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

   const _wither: TC.UC_WitherF<[URI], V_> = (G) => (wa, f) => {
      const traverseF = _traverse(G);
      return pipe(traverseF(wa, f), G.map(Filterable.compact));
   };

   const _wilt: TC.UC_WiltF<[URI], V_> = (G) => (wa, f) => {
      const traverseF = _traverse(G);
      return pipe(traverseF(wa, f), G.map(Filterable.separate));
   };

   return HKT.instance<TC.Witherable<[URI], V_>>({
      ...Functor,
      ...Filterable,
      ...Traversable,
      ...Foldable,
      _wither,
      _wilt,
      wither: (G) => (f) => (wa) => _wither(G)(wa, f),
      wilt: (G) => (f) => (wa) => _wilt(G)(wa, f)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplicativeValidation = <E>(
   S: TC.Semigroup<E>
): TC.Applicative<[URI], V & HKT.Fix<"E", E>> => {
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
      _ap: (fab, fa) => pipe(fab, apV(fa)),
      pure,
      mapBoth: mapBothV,
      _mapBoth: (fa, fb, f) => pipe(fa, mapBothV(fb, f)),
      any
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getAltValidation = <E>(S: TC.Semigroup<E>): TC.Alt<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const _altV: TC.UC_AltF<[URI], V_> = (fa, that) => {
      if (isRight(fa)) {
         return fa;
      }
      const ea = that();
      return isLeft(ea) ? left(S.concat(fa.left)(ea.left)) : ea;
   };

   return HKT.instance<TC.Alt<[URI], V_>>({
      ...Functor,
      _alt: _altV,
      alt: (that) => (fa) => _altV(fa, that)
   });
};

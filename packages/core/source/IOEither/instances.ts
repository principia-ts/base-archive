import type { Either } from "../Either";
import * as E from "../Either";
import { flow, not, pipe, Predicate } from "../Function";
import * as HKT from "../HKT";
import * as I from "../IO";
import { getLeft, getRight } from "../Maybe";
import type * as TC from "../typeclass-index";
import { right } from "./constructors";
import type { IOEither, URI, V } from "./IOEither";
import {
   _alt,
   _ap,
   _bimap,
   _chain,
   _first,
   _map,
   _mapBoth,
   alt,
   ap,
   bimap,
   chain,
   first,
   flatten,
   map,
   mapBoth,
   pure
} from "./methods";

/*
 * -------------------------------------------
 * IOEither Instances
 * -------------------------------------------
 */

/**
 * ```haskell
 * getSemigroup :: <e, a>Semigroup a -> Semigroup (IOEither e a)
 * ```
 *
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getSemigroup = <E, A>(S: TC.Semigroup<A>): TC.Semigroup<IOEither<E, A>> =>
   I.getSemigroup(E.getSemigroup<E, A>(S));

/**
 * ```haskell
 * getApplySemigroup :: <e, a>Semigroup a -> Semigroup (IOEither e a)
 * ```
 *
 * Semigroup returning the left-most `Left` value. If both operands are `Right`s then the inner values are concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getApplySemigroup = <E, A>(S: TC.Semigroup<A>): TC.Semigroup<IOEither<E, A>> =>
   I.getSemigroup(E.getApplySemigroup<E, A>(S));

/**
 * @category Instances
 * @since 1.0.0
 */
export const getrpplyMonoid = <E, A>(M: TC.Monoid<A>): TC.Monoid<IOEither<E, A>> => ({
   ...getApplySemigroup(M),
   empty: right(M.empty)
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: TC.Functor<[URI], V> = HKT.instance({
   _map,
   map
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
export const Apply: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   _ap,
   ap,
   _mapBoth,
   mapBoth
});

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
   _chain,
   chain,
   flatten
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
export const getApplicativeIOValidation = <E>(S: TC.Semigroup<E>): TC.Applicative<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const AV = E.getApplicativeValidation(S);

   const _apV: TC.UC_ApF<[URI], V_> = <A, B>(fab: IOEither<E, (a: A) => B>, fa: IOEither<E, A>) =>
      pipe(
         I._map(fab, (gab) => (ga: Either<E, A>) => AV._ap(gab, ga)),
         I.ap(fa)
      );

   const _mapBothV: TC.UC_MapBothF<[URI], V_> = (fa, fb, f) =>
      I._mapBoth(fa, fb, (ga, gb) => AV._mapBoth(ga, gb, (a, b) => f(a, b)));

   return HKT.instance<TC.Applicative<[URI], V_>>({
      ...Functor,
      pure,
      _ap: _apV,
      ap: (fa) => (fab) => _apV(fab, fa),
      _mapBoth: _mapBothV,
      mapBoth: (fb, f) => (fa) => _mapBothV(fa, fb, f)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getAltIOValidation = <E>(S: TC.Semigroup<E>): TC.Alt<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const A = E.getAltValidation(S);

   const _altV: TC.UC_AltF<[URI], V_> = (fa, that) => () => A._alt(fa(), () => that()());

   return HKT.instance<TC.Alt<[URI], V_>>({
      ...Functor,
      _map,
      map,
      _alt: _altV,
      alt: (that) => (fa) => _altV(fa, that)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFilterable = <E>(M: TC.Monoid<E>): TC.Filterable<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const F = E.getFilterable(M);

   const compact: TC.CompactF<[URI], V_> = (fa) => I._map(fa, F.compact);

   const separate: TC.SeparateF<[URI], V_> = (fge) => ({
      left: pipe(_map(fge, getLeft), compact),
      right: pipe(_map(fge, getRight), compact)
   });

   const _filter: TC.UC_FilterF<[URI], V_> = <A>(fga: IOEither<E, A>, predicate: Predicate<A>) =>
      I._map(fga, (ga) => F._filter(ga, predicate));

   const _mapMaybe: TC.UC_MapMaybeF<[URI], V_> = (fa, f) => I._map(fa, (ga) => F._mapMaybe(ga, f));

   const _partition: TC.UC_PartitionF<[URI], V_> = <A>(fga: IOEither<E, A>, predicate: Predicate<A>) => ({
      left: _filter(fga, not(predicate)),
      right: _filter(fga, predicate)
   });

   const _mapEither: TC.UC_MapEitherF<[URI], V_> = (fa, f) => ({
      left: _mapMaybe(fa, flow(f, getLeft)),
      right: _mapMaybe(fa, flow(f, getRight))
   });

   return HKT.instance<TC.Filterable<[URI], V_>>({
      ...Functor,
      compact,
      separate,
      _filter,
      _mapMaybe,
      _partition,
      _mapEither,
      filter: <A>(predicate: Predicate<A>) => (fa: IOEither<E, A>) => _filter(fa, predicate),
      mapMaybe: (f) => (fa) => _mapMaybe(fa, f),
      partition: <A>(predicate: Predicate<A>) => (fa: IOEither<E, A>) => _partition(fa, predicate),
      mapEither: (f) => (fa) => _mapEither(fa, f)
   });
};

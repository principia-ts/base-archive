import type { Either } from "../Either";
import * as E from "../Either";
import type { Predicate } from "../Function";
import { flow, not, pipe } from "../Function";
import * as HKT from "../HKT";
import * as I from "../IO";
import { getLeft, getRight } from "../Option";
import type * as TC from "../typeclass-index";
import { right } from "./constructors";
import type { IOEither, URI, V } from "./IOEither";
import {
   alt,
   alt_,
   ap,
   ap_,
   bimap,
   bimap_,
   chain,
   chain_,
   first,
   first_,
   flatten,
   map,
   map_,
   mapBoth,
   mapBoth_,
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
   map_: map_,
   map
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: TC.Bifunctor<[URI], V> = HKT.instance({
   bimap_: bimap_,
   bimap,
   first_: first_,
   first,
   second_: map_,
   second: map
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Apply: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_: ap_,
   ap,
   mapBoth_: mapBoth_,
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
   chain_: chain_,
   chain,
   flatten
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Alt: TC.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_: alt_,
   alt
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplicativeIOValidation = <E>(S: TC.Semigroup<E>): TC.Applicative<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const AV = E.getApplicativeValidation(S);

   const apV_: TC.UC_ApF<[URI], V_> = <A, B>(fab: IOEither<E, (a: A) => B>, fa: IOEither<E, A>) =>
      pipe(
         I.map_(fab, (gab) => (ga: Either<E, A>) => AV.ap_(gab, ga)),
         I.ap(fa)
      );

   const mapBothV_: TC.UC_MapBothF<[URI], V_> = (fa, fb, f) =>
      I.mapBoth_(fa, fb, (ga, gb) => AV.mapBoth_(ga, gb, (a, b) => f(a, b)));

   return HKT.instance<TC.Applicative<[URI], V_>>({
      ...Functor,
      pure,
      ap_: apV_,
      ap: (fa) => (fab) => apV_(fab, fa),
      mapBoth_: mapBothV_,
      mapBoth: (fb, f) => (fa) => mapBothV_(fa, fb, f)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getAltIOValidation = <E>(S: TC.Semigroup<E>): TC.Alt<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const A = E.getAltValidation(S);

   const altV_: TC.UC_AltF<[URI], V_> = (fa, that) => () => A.alt_(fa(), () => that()());

   return HKT.instance<TC.Alt<[URI], V_>>({
      ...Functor,
      map_: map_,
      map,
      alt_: altV_,
      alt: (that) => (fa) => altV_(fa, that)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFilterable = <E>(M: TC.Monoid<E>): TC.Filterable<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const F = E.getFilterable(M);

   const compact: TC.CompactF<[URI], V_> = (fa) => I.map_(fa, F.compact);

   const separate: TC.SeparateF<[URI], V_> = (fge) => ({
      left: pipe(map_(fge, getLeft), compact),
      right: pipe(map_(fge, getRight), compact)
   });

   const filter_: TC.UC_FilterF<[URI], V_> = <A>(fga: IOEither<E, A>, predicate: Predicate<A>) =>
      I.map_(fga, (ga) => F.filter_(ga, predicate));

   const mapOption_: TC.UC_MapOptionF<[URI], V_> = (fa, f) => I.map_(fa, (ga) => F.mapOption_(ga, f));

   const partition_: TC.UC_PartitionF<[URI], V_> = <A>(fga: IOEither<E, A>, predicate: Predicate<A>) => ({
      left: filter_(fga, not(predicate)),
      right: filter_(fga, predicate)
   });

   const mapEither_: TC.UC_MapEitherF<[URI], V_> = (fa, f) => ({
      left: mapOption_(fa, flow(f, getLeft)),
      right: mapOption_(fa, flow(f, getRight))
   });

   return HKT.instance<TC.Filterable<[URI], V_>>({
      ...Functor,
      compact,
      separate,
      filter_: filter_,
      mapOption_: mapOption_,
      partition_: partition_,
      mapEither_: mapEither_,
      filter: <A>(predicate: Predicate<A>) => (fa: IOEither<E, A>) => filter_(fa, predicate),
      mapOption: (f) => (fa) => mapOption_(fa, f),
      partition: <A>(predicate: Predicate<A>) => (fa: IOEither<E, A>) => partition_(fa, predicate),
      mapEither: (f) => (fa) => mapEither_(fa, f)
   });
};

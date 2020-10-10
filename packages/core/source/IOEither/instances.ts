import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as E from "../Either";
import type { Predicate } from "../Function";
import { flow, not, pipe } from "../Function";
import * as I from "../IO";
import { getLeft, getRight } from "../Option";
import { right } from "./constructors";
import type { IOEither, URI, V } from "./IOEither";
import {
   alt,
   alt_,
   ap,
   ap_,
   bimap,
   bimap_,
   both,
   both_,
   first,
   first_,
   flatten,
   map,
   map_,
   mapBoth,
   mapBoth_,
   unit
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
export const getSemigroup = <E, A>(S: P.Semigroup<A>): P.Semigroup<IOEither<E, A>> =>
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
export const getApplySemigroup = <E, A>(S: P.Semigroup<A>): P.Semigroup<IOEither<E, A>> =>
   I.getSemigroup(E.getApplySemigroup<E, A>(S));

/**
 * @category Instances
 * @since 1.0.0
 */
export const getrpplyMonoid = <E, A>(M: P.Monoid<A>): P.Monoid<IOEither<E, A>> => ({
   ...getApplySemigroup(M),
   nat: right(M.nat)
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: P.Functor<[URI], V> = HKT.instance({
   map_: map_,
   map
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
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
export const Apply: P.Apply<[URI], V> = HKT.instance({
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
export const Applicative: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_,
   both,
   unit
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_: alt_,
   alt
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplicativeIOValidation = <E>(S: P.Semigroup<E>): P.Applicative<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const AV = E.getApplicativeValidation(S);

   const bothV_: P.BothFn_<[URI], V_> = (fa, fb) =>
      pipe(
         fa,
         I.both(fb),
         I.map(([ea, eb]) => AV.both_(ea, eb))
      );

   return HKT.instance<P.Applicative<[URI], V_>>({
      ...Functor,
      unit,
      both_: bothV_,
      both: (fb) => (fa) => bothV_(fa, fb)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getAltIOValidation = <E>(S: P.Semigroup<E>): P.Alt<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const A = E.getAltValidation(S);

   const altV_: P.AltFn_<[URI], V_> = (fa, that) => () => A.alt_(fa(), () => that()());

   return HKT.instance<P.Alt<[URI], V_>>({
      ...Functor,
      alt_: altV_,
      alt: (that) => (fa) => altV_(fa, that)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFilterable = <E>(M: P.Monoid<E>): P.Filterable<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const F = E.getFilterable(M);

   const filter_: P.FilterFn_<[URI], V_> = <A>(fga: IOEither<E, A>, predicate: Predicate<A>) =>
      I.map_(fga, (ga) => F.filter_(ga, predicate));

   const mapOption_: P.MapOptionFn_<[URI], V_> = (fa, f) => I.map_(fa, (ga) => F.mapOption_(ga, f));

   const partition_: P.PartitionFn_<[URI], V_> = <A>(fga: IOEither<E, A>, predicate: Predicate<A>) => ({
      left: filter_(fga, not(predicate)),
      right: filter_(fga, predicate)
   });

   const mapEither_: P.MapEitherFn_<[URI], V_> = (fa, f) => ({
      left: mapOption_(fa, flow(f, getLeft)),
      right: mapOption_(fa, flow(f, getRight))
   });

   return HKT.instance<P.Filterable<[URI], V_>>({
      ...Functor,
      filter_: filter_,
      mapOption_,
      partition_,
      mapEither_,
      filter: <A>(predicate: Predicate<A>) => (fa: IOEither<E, A>) => filter_(fa, predicate),
      mapOption: (f) => (fa) => mapOption_(fa, f),
      partition: <A>(predicate: Predicate<A>) => (fa: IOEither<E, A>) => partition_(fa, predicate),
      mapEither: (f) => (fa) => mapEither_(fa, f)
   });
};

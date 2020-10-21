import type * as P from "@principia/prelude";
import { fromCombine } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { getAltValidationF, getApplicativeValidationF, getFilterableF } from "../DSL";
import * as F from "../XPure";
import { fail, succeed } from "./constructors";
import {
   absolve,
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
   recover,
   unit
} from "./methods";
import type { EIO, URI, V } from "./model";

/*
 * -------------------------------------------
 * EIO Instances
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
export const getSemigroup = <E, A>(S: P.Semigroup<A>): P.Semigroup<EIO<E, A>> =>
   fromCombine((x, y) => map_(both_(x, y), ([x_, y_]) => S.combine_(x_, y_)));

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
export const getApplySemigroup = <E, A>(S: P.Semigroup<A>): P.Semigroup<EIO<E, A>> =>
   fromCombine((x, y) =>
      F.foldM_(
         y,
         () => x,
         (y_) =>
            F.foldM_(
               x,
               () => y,
               (x_) => succeed(S.combine_(x_, y_))
            )
      )
   );

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplyMonoid = <E, A>(M: P.Monoid<A>): P.Monoid<EIO<E, A>> => ({
   ...getApplySemigroup(M),
   nat: succeed(M.nat)
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

export const Fail: P.Fail<[URI], V> = HKT.instance({
   fail
});

export const Fallible: P.Fallible<[URI], V> = HKT.instance({
   ...Fail,
   absolve,
   recover
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplicativeValidation: <E>(
   S: P.Semigroup<E>
) => P.Applicative<[URI], HKT.Fix<"E", E>> = getApplicativeValidationF({ ...Monad, ...Applicative, ...Fallible });

/**
 * @category Instances
 * @since 1.0.0
 */
export const getAltValidation: <E>(S: P.Semigroup<E>) => P.Alt<[URI], HKT.Fix<"E", E>> = getAltValidationF({
   ...Monad,
   ...Alt,
   ...Fallible
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFilterable: <E>(M: P.Monoid<E>) => P.Filterable<[URI], HKT.Fix<"E", E>> = getFilterableF({
   ...Monad,
   ...Fallible,
   ...Applicative
});

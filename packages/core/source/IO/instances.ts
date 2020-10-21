import * as P from "@principia/prelude";
import { fromCombine } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { ap, ap_, both, both_, flatten, map, map_, mapBoth, mapBoth_, pure, unit } from "./methods";
import type { IO, URI, V } from "./model";

/*
 * -------------------------------------------
 * IO Typeclass Instances
 * -------------------------------------------
 */

/**
 * ```haskell
 * getSemigroup :: Semigroup s => s a -> s (IO a)
 * ```
 *
 * Lifts a `Semigroup` into `IO`, the inner values are concatenated with the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getSemigroup = <A>(S: P.Semigroup<A>): P.Semigroup<IO<A>> =>
   fromCombine((x, y) => map_(both_(x, y), ([x_, y_]) => S.combine_(x_, y_)));

/**
 * ```haskell
 * getMonoid :: Monoid m => m a -> m (IO a)
 * ```
 *
 * Lifts a `Monoid` into `IO`, the inner values are concatenated with the provided `Monoid`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getMonoid = <A>(M: P.Monoid<A>): P.Monoid<IO<A>> => ({
   ...getSemigroup(M),
   nat: pure(M.nat)
});

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map_: map_,
   map
});

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_: ap_,
   ap,
   mapBoth_: mapBoth_,
   mapBoth
});

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_,
   both,
   unit
});

export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});

export const Do: P.Do<[URI], V> = P.deriveDo(Monad);

import * as HKT from "../HKT";
import * as TC from "../typeclass-index";
import type { IO, URI, V } from "./IO";
import { ap, ap_, chain, chain_, flatten, map, map_, mapBoth, mapBoth_, pure } from "./methods";

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
export const getSemigroup = <A>(S: TC.Semigroup<A>): TC.Semigroup<IO<A>> => ({
   concat: (x) => (y) => () => S.concat(x())(y())
});

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
export const getMonoid = <A>(M: TC.Monoid<A>): TC.Monoid<IO<A>> => ({
   ...getSemigroup(M),
   empty: pure(M.empty)
});

export const Functor: TC.Functor<[URI], V> = HKT.instance({
   map_: map_,
   map
});

export const Apply: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_: ap_,
   ap,
   mapBoth_: mapBoth_,
   mapBoth
});

export const Applicative: TC.Applicative<[URI], V> = HKT.instance({
   ...Apply,
   pure
});

export const Monad: TC.Monad<[URI], V> = HKT.instance({
   ...Applicative,
   chain_: chain_,
   chain,
   flatten
});

export const Do: TC.Do<[URI], V> = TC.deriveDo(Monad);

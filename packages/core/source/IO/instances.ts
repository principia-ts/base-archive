import * as HKT from "../HKT";
import type * as TC from "../typeclass-index";
import type { IO, URI, V } from "./IO";
import {
   _ap,
   _chain,
   _map,
   _mapBoth,
   any,
   ap,
   apS,
   bindS,
   bindToS,
   chain,
   letS,
   map,
   mapBoth,
   pure
} from "./methods";

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
   _map,
   map
});

export const Apply: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   _ap,
   ap,
   _mapBoth,
   mapBoth
});

export const Applicative: TC.Applicative<[URI], V> = HKT.instance({
   ...Apply,
   pure,
   any
});

export const ApplicativeDo: TC.ApplicativeDo<[URI], V> = HKT.instance({
   ...Applicative,
   bindS,
   letS,
   apS,
   bindToS
});

export const Monad: TC.Monad<[URI], V> = HKT.instance({
   ...Applicative,
   _chain,
   chain
});

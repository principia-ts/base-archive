import * as HKT from "../HKT";
import type * as TC from "../typeclass-index";
import { never } from "./constructors";
import {
   _ap,
   _apSeq,
   _chain,
   _map,
   _mapBoth,
   _mapBothSeq,
   any,
   ap,
   apSeq,
   chain,
   map,
   mapBoth,
   mapBothSeq,
   pure
} from "./methods";
import type { Task, URI, V } from "./Task";

/*
 * -------------------------------------------
 * Task Typeclass Instances
 * -------------------------------------------
 */

/**
 * ```haskell
 * getSemigroup :: Semigroup s => s a -> s (Task a)
 * ```
 *
 * Lift a `Semigroup` into 'Task', the inner values are concatenated using the provided `Semigroup`.
 *
 * @category Instances
 * @since 1.0.0
 */
export const getSemigroup = <A>(S: TC.Semigroup<A>): TC.Semigroup<Task<A>> => ({
   concat: (x) => (y) => () => x().then((rx) => y().then((ry) => S.concat(rx)(ry)))
});

/**
 * ```haskell
 * getMonoid :: Monoid m => m a -> m (Task a)
 * ```
 *
 * Lift a `Monoid` into `Task`, the inner values are concatenated using the provided `Monoid`.
 *
 * @category Instances
 * @since 1.0.0
 */
export const getMonoid = <A>(M: TC.Monoid<A>): TC.Monoid<Task<A>> => ({
   ...getSemigroup(M),
   empty: pure(M.empty)
});

/**
 * ```haskell
 * getRaceMonoid :: <a>() -> Monoid (Task a)
 * ```
 *
 * Monoid returning the first completed task.
 *
 * Note: uses `Promise.race` internally.
 *
 * @category Instances
 * @since 1.0.0
 */
export const getRaceMonoid = <A = never>(): TC.Monoid<Task<A>> => ({
   concat: (x) => (y) => () => Promise.race([x(), y()]),
   empty: never
});

export const Functor: TC.Functor<[URI], V> = HKT.instance({
   _map,
   map
});

export const ApplyPar: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   _ap,
   ap,
   _mapBoth,
   mapBoth
});

export const ApplySeq: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   _ap: _apSeq,
   ap: apSeq,
   _mapBoth: _mapBothSeq,
   mapBoth: mapBothSeq
});

export const ApplicativePar: TC.Applicative<[URI], V> = HKT.instance({
   ...ApplyPar,
   pure,
   unit: any
});

export const ApplicativeSeq: TC.Applicative<[URI], V> = HKT.instance({
   ...ApplySeq,
   pure,
   unit: any
});

export const MonadPar: TC.Monad<[URI], V> = HKT.instance({
   ...ApplicativePar,
   _chain,
   chain
});

export const MonadSeq: TC.Monad<[URI], V> = HKT.instance({
   ...ApplicativeSeq,
   _chain,
   chain
});

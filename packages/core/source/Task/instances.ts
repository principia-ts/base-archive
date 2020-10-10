import type * as P from "@principia/prelude";
import { fromCombine, makeMonoid } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { never } from "./constructors";
import {
   ap,
   ap_,
   apSeq,
   apSeq_,
   both,
   both_,
   bothSeq,
   bothSeq_,
   flatten,
   map,
   map_,
   mapBoth,
   mapBoth_,
   mapBothSeq,
   mapBothSeq_,
   pure,
   unit
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
export const getSemigroup = <A>(S: P.Semigroup<A>): P.Semigroup<Task<A>> =>
   fromCombine((x, y) => () => x().then((rx) => y().then((ry) => S.combine_(rx, ry))));

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
export const getMonoid = <A>(M: P.Monoid<A>): P.Monoid<Task<A>> => ({
   ...getSemigroup(M),
   nat: pure(M.nat)
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
export const getRaceMonoid = <A = never>(): P.Monoid<Task<A>> =>
   makeMonoid<Task<A>>((x, y) => () => Promise.race([x(), y()]), never);

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map_: map_,
   map
});

export const ApplyPar: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_: ap_,
   ap,
   mapBoth_: mapBoth_,
   mapBoth
});

export const ApplySeq: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_: apSeq_,
   ap: apSeq,
   mapBoth_: mapBothSeq_,
   mapBoth: mapBothSeq
});

export const ApplicativePar: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_,
   both,
   unit
});

export const ApplicativeSeq: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_: bothSeq_,
   both: bothSeq,
   unit
});

export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});

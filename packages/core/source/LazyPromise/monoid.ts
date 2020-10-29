import type { Monoid } from "@principia/prelude/Monoid";
import { makeMonoid } from "@principia/prelude/Monoid";

import { pure } from "./applicative";
import { never } from "./constructors";
import type { LazyPromise } from "./model";
import { getSemigroup } from "./semigroup";

/*
 * -------------------------------------------
 * Monoid LazyPromise
 * -------------------------------------------
 */

/**
 * ```haskell
 * getMonoid :: Monoid m => m a -> m (LazyPromise a)
 * ```
 *
 * Lift a `Monoid` into `LazyPromise`, the inner values are concatenated using the provided `Monoid`.
 *
 * @category Instances
 * @since 1.0.0
 */
export const getMonoid = <A>(M: Monoid<A>): Monoid<LazyPromise<A>> => ({
   ...getSemigroup(M),
   nat: pure(M.nat)
});

/**
 * ```haskell
 * getRaceMonoid :: <a>() -> Monoid (LazyPromise a)
 * ```
 *
 * Monoid returning the first completed task.
 *
 * Note: uses `Promise.race` internally.
 *
 * @category Instances
 * @since 1.0.0
 */
export const getRaceMonoid = <A = never>(): Monoid<LazyPromise<A>> =>
   makeMonoid<LazyPromise<A>>((x, y) => () => Promise.race([x(), y()]), never);

import { fail, foldM_, pure } from "../core";
import type { Effect } from "../Effect";

/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export const extend_ = <R, E, A, B>(wa: Effect<R, E, A>, f: (wa: Effect<R, E, A>) => B): Effect<R, E, B> =>
   foldM_(
      wa,
      (e) => fail(e),
      (_) => pure(f(wa))
   );

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export const extend = <R, E, A, B>(f: (wa: Effect<R, E, A>) => B) => (wa: Effect<R, E, A>): Effect<R, E, B> =>
   extend_(wa, f);

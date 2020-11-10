import { fail, foldM_, pure } from "../_core";
import type { Task } from "../model";

/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export const extend_ = <R, E, A, B>(wa: Task<R, E, A>, f: (wa: Task<R, E, A>) => B): Task<R, E, B> =>
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
export const extend = <R, E, A, B>(f: (wa: Task<R, E, A>) => B) => (wa: Task<R, E, A>): Task<R, E, B> => extend_(wa, f);

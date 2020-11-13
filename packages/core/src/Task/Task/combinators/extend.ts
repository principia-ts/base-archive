import { fail, foldM_, pure } from "../_core";
import type { Task } from "../model";

/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export function extend_<R, E, A, B>(wa: Task<R, E, A>, f: (wa: Task<R, E, A>) => B): Task<R, E, B> {
   return foldM_(
      wa,
      (e) => fail(e),
      (_) => pure(f(wa))
   );
}

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export function extend<R, E, A, B>(f: (wa: Task<R, E, A>) => B): (wa: Task<R, E, A>) => Task<R, E, B> {
   return (wa) => extend_(wa, f);
}

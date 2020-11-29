import { fail, foldM_, pure } from "../_core";
import type { AIO } from "../model";

/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export function extend_<R, E, A, B>(wa: AIO<R, E, A>, f: (wa: AIO<R, E, A>) => B): AIO<R, E, B> {
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
export function extend<R, E, A, B>(f: (wa: AIO<R, E, A>) => B): (wa: AIO<R, E, A>) => AIO<R, E, B> {
  return (wa) => extend_(wa, f);
}

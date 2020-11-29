import type { Exit } from "../../Exit";
import type { RuntimeFiber } from "../../Fiber";
import { chain_ } from "../_core";
import type { AIO } from "../model";
import { bracket_ } from "./bracket";
import { forkDaemon } from "./core-scope";
import { fiberId } from "./fiberId";

/**
 * ```haskell
 * _bracketFiber :: (
 *    AIO r e a,
 *    ((FiberRuntime e a) -> AIO r1 e1 b)
 * ) -> AIO (r & r1) e1 (Exit e a)
 * ```
 *
 * Fork the AIO into a separate fiber wrapping it in a bracket and returining
 * the `use` handle. Acquisition will fork and release will interrupt the fiber
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketFiber_<R, E, A, R1, E1, B>(
  ef: AIO<R, E, A>,
  use: (f: RuntimeFiber<E, A>) => AIO<R1, E1, B>
): AIO<R & R1, E1, Exit<E, A>> {
  return bracket_(forkDaemon(ef), (f) => chain_(fiberId(), (id) => f.interruptAs(id)), use);
}

/**
 * ```haskell
 * bracketFiber :: ((FiberRuntime e a) -> AIO r1 e1 b) ->
 *    AIO r e a -> AIO (r & r1) e1 (Exit e a)
 * ```
 *
 * Fork the AIO into a separate fiber wrapping it in a bracket and returining the
 * `use` handle. Acquisition will fork and release will interrupt the fiber
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketFiber<E, A, R1, E1, A1>(
  use: (f: RuntimeFiber<E, A>) => AIO<R1, E1, A1>
): <R>(ef: AIO<R, E, A>) => AIO<R & R1, E1, Exit<E, A>> {
  return (ef) => bracketFiber_(ef, use);
}

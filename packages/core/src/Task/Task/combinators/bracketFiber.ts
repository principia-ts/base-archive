import { chain_ } from "../_core";
import type { Exit } from "../../Exit";
import type { RuntimeFiber } from "../../Fiber";
import { forkDaemon } from "./core-scope";
import type { Task } from "../model";
import { bracket_ } from "./bracket";
import { fiberId } from "./fiberId";

/**
 * ```haskell
 * _bracketFiber :: (
 *    Task r e a,
 *    ((FiberRuntime e a) -> Task r1 e1 b)
 * ) -> Task (r & r1) e1 (Exit e a)
 * ```
 *
 * Fork the task into a separate fiber wrapping it in a bracket and returining
 * the `use` handle. Acquisition will fork and release will interrupt the fiber
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketFiber_<R, E, A, R1, E1, B>(
  ef: Task<R, E, A>,
  use: (f: RuntimeFiber<E, A>) => Task<R1, E1, B>
): Task<R & R1, E1, Exit<E, A>> {
  return bracket_(forkDaemon(ef), (f) => chain_(fiberId(), (id) => f.interruptAs(id)), use);
}

/**
 * ```haskell
 * bracketFiber :: ((FiberRuntime e a) -> Task r1 e1 b) ->
 *    Task r e a -> Task (r & r1) e1 (Exit e a)
 * ```
 *
 * Fork the task into a separate fiber wrapping it in a bracket and returining the
 * `use` handle. Acquisition will fork and release will interrupt the fiber
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketFiber<E, A, R1, E1, A1>(
  use: (f: RuntimeFiber<E, A>) => Task<R1, E1, A1>
): <R>(ef: Task<R, E, A>) => Task<R & R1, E1, Exit<E, A>> {
  return (ef) => bracketFiber_(ef, use);
}

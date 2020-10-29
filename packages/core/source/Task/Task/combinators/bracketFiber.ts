import type { RuntimeFiber } from "../../Fiber";
import { chain_ } from "../_core";
import { forkDaemon } from "../core-scope";
import type { Task } from "../model";
import { bracket_ } from "./bracket";
import { checkFiberId } from "./checkFiberId";

/**
 * ```haskell
 * _bracketFiber :: (
 *    Task r e a,
 *    ((FiberRuntime e a) -> Task r1 e1 b)
 * ) -> Task (r & r1) e1 (Exit e a)
 * ```
 *
 * Fork the effect into a separate fiber wrapping it in a bracket and returining
 * the `use` handle. Acquisition will fork and release will interrupt the fiber
 *
 * @category Combinators
 * @since 1.0.0
 */
export const bracketFiber_ = <R, E, A, R1, E1, B>(ef: Task<R, E, A>, use: (f: RuntimeFiber<E, A>) => Task<R1, E1, B>) =>
   bracket_(forkDaemon(ef), (f) => chain_(checkFiberId(), (id) => f.interruptAs(id)), use);

/**
 * ```haskell
 * bracketFiber :: ((FiberRuntime e a) -> Task r1 e1 b) ->
 *    Task r e a -> Task (r & r1) e1 (Exit e a)
 * ```
 *
 * Fork the effect into a separate fiber wrapping it in a bracket and returining the
 * `use` handle. Acquisition will fork and release will interrupt the fiber
 *
 * @category Combinators
 * @since 1.0.0
 */
export const bracketFiber = <E, A, R1, E1, A1>(use: (f: RuntimeFiber<E, A>) => Task<R1, E1, A1>) => <R>(
   ef: Task<R, E, A>
) => bracketFiber_(ef, use);

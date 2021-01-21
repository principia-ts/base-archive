import type { Exit } from '../../Exit'
import type { RuntimeFiber } from '../../Fiber'
import type { IO } from '../core'

import { chain_ } from '../core'
import { bracket_ } from './bracket'
import { forkDaemon } from './core-scope'
import { fiberId } from './fiberId'

/**
 * ```haskell
 * _bracketFiber :: (
 *    IO r e a,
 *    ((FiberRuntime e a) -> IO r1 e1 b)
 * ) -> IO (r & r1) e1 (Exit e a)
 * ```
 *
 * Fork the IO into a separate fiber wrapping it in a bracket and returining
 * the `use` handle. Acquisition will fork and release will interrupt the fiber
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketFiber_<R, E, A, R1, E1, B>(
  ma: IO<R, E, A>,
  use: (f: RuntimeFiber<E, A>) => IO<R1, E1, B>
): IO<R & R1, E1, Exit<E, A>> {
  return bracket_(forkDaemon(ma), (f) => chain_(fiberId(), (id) => f.interruptAs(id)), use)
}

/**
 * ```haskell
 * bracketFiber :: ((FiberRuntime e a) -> IO r1 e1 b) ->
 *    IO r e a -> IO (r & r1) e1 (Exit e a)
 * ```
 *
 * Fork the IO into a separate fiber wrapping it in a bracket and returining the
 * `use` handle. Acquisition will fork and release will interrupt the fiber
 *
 * @category Combinators
 * @since 1.0.0
 */
export function bracketFiber<E, A, R1, E1, A1>(
  use: (f: RuntimeFiber<E, A>) => IO<R1, E1, A1>
): <R>(ma: IO<R, E, A>) => IO<R & R1, E1, Exit<E, A>> {
  return (ma) => bracketFiber_(ma, use)
}

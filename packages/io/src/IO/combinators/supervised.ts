import type { Supervisor } from '../../Supervisor'
import type { IO } from '../core'

import { SuperviseInstruction } from '../core'

/**
 * ```haskell
 * supervised_ :: (IO r e a, Supervisor _) -> IO r e a
 * ```
 *
 * Returns an IO with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function supervised_<R, E, A>(fa: IO<R, E, A>, supervisor: Supervisor<any>): IO<R, E, A> {
  return new SuperviseInstruction(fa, supervisor)
}

/**
 * ```haskell
 * supervised :: Supervisor _ -> IO r e a -> IO r e a
 * ```
 *
 * Returns an IO with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function supervised(supervisor: Supervisor<any>): <R, E, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => supervised_(fa, supervisor)
}

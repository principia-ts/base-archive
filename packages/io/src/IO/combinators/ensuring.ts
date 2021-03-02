import type { IO } from '../core'

import * as C from '../../Cause/core'
import { halt, matchCauseM_, pure } from '../core'
import { uninterruptibleMask } from './interrupt'

/**
 * Returns an IO that, if this IO _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this IO
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the IO's result, see onExit.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `bracket`.
 */
export function ensuring_<R, E, A, R1>(ma: IO<R, E, A>, finalizer: IO<R1, never, any>): IO<R & R1, E, A> {
  return uninterruptibleMask(({ restore }) =>
    matchCauseM_(
      restore(ma),
      (cause1) =>
        matchCauseM_(
          finalizer,
          (cause2) => halt(C.then(cause1, cause2)),
          (_) => halt(cause1)
        ),
      (value) =>
        matchCauseM_(
          finalizer,
          (cause1) => halt(cause1),
          (_) => pure(value)
        )
    )
  )
}

/**
 * Returns an IO that, if this IO _starts_ execution, then the
 * specified `finalizer` is guaranteed to begin execution, whether this IO
 * succeeds, fails, or is interrupted.
 *
 * For use cases that need access to the IO's result, see onExit.
 *
 * Finalizers offer very powerful guarantees, but they are low-level, and
 * should generally not be used for releasing resources. For higher-level
 * logic built on `ensuring`, see `bracket`.
 */
export function ensuring<R1>(finalizer: IO<R1, never, any>): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E, A> {
  return (ma) => ensuring_(ma, finalizer)
}

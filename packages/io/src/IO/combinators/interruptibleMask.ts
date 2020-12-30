import type { IO } from '../core'
import type { InterruptStatusRestore } from './interrupt'

import { checkInterruptible } from '../core'
import { InterruptStatusRestoreImpl, makeInterruptible } from './interrupt'

/**
 * Makes the effect interruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 */
export function interruptibleMask<R, E, A>(f: (restore: InterruptStatusRestore) => IO<R, E, A>): IO<R, E, A> {
  return checkInterruptible((flag) => makeInterruptible(f(new InterruptStatusRestoreImpl(flag))))
}

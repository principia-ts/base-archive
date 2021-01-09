import type { IO } from '../core'

import { checkInterruptible } from '../core'
import { InterruptStatusRestore, makeInterruptible } from './interrupt'

/**
 * Makes the effect interruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 */
export function interruptibleMask<R, E, A>(f: (restore: InterruptStatusRestore) => IO<R, E, A>): IO<R, E, A> {
  return checkInterruptible((flag) => makeInterruptible(f(new InterruptStatusRestore(flag))))
}

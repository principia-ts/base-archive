import type { FIO } from '../core'

import { RuntimeError } from '../../Cause/core'
import { die } from '../core'

/**
 * Returns an IO that dies with a `RuntimeError` having the
 * specified message. This method can be used for terminating a fiber
 * because a defect has been detected in the code.
 */
export function dieMessage(message: string): FIO<never, never> {
  return die(new RuntimeError(message))
}

import type { IO } from '../core'

import { interruptAll } from '../../Fiber'
import { ensuringChildren_ } from './ensuringChildren'

/**
 * Returns a new effect that will not succeed with its value before first
 * interrupting all child fibers forked by the effect.
 */
export function interruptAllChildren<R, E, A>(ma: IO<R, E, A>): IO<R, E, A> {
  return ensuringChildren_(ma, interruptAll)
}

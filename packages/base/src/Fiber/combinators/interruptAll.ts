import type { Fiber } from '../core'

import * as I from '../../IO/core'
import { interruptAllAs_ } from './interrupt'

/**
 * Interrupts all fibers and awaits their interruption
 */
export const interruptAll = (fs: Iterable<Fiber<any, any>>) => I.bind_(I.fiberId(), (id) => interruptAllAs_(fs, id))

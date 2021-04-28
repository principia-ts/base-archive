import type { Fiber } from '../core'

import { flow } from '../../function'
import * as M from '../../Managed/core'
import * as I from '../internal/io'
import { interrupt } from './interrupt'

export const toManaged: <E, A>(fiber: Fiber<E, A>) => M.UManaged<Fiber<E, A>> = flow(I.succeed, M.make(interrupt))

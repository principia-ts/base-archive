import type { Exit } from '../../Exit'
import type { Fiber } from '../core'

import { foreachPar_ } from '../../IO/combinators/foreachPar'
import * as I from '../_internal/io'

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export const awaitAll = <E, A>(as: Iterable<Fiber<E, A>>): I.IO<unknown, never, Exit<E, ReadonlyArray<A>>> =>
  I.result(foreachPar_(as, (f) => I.flatMap_(f.await, I.done)))
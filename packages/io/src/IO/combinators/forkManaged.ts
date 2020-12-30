import type { FiberContext } from '../../Fiber'
import type { Managed } from '../../Managed'
import type { IO } from '../core'

import { fork } from '../../Managed/combinators'
import { toManaged } from './toManaged'

export function forkManaged<R, E, A>(ma: IO<R, E, A>): Managed<R, never, FiberContext<E, A>> {
  return fork(toManaged()(ma))
}

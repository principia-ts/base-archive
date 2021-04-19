import type { RuntimeFiber } from '../../Fiber'
import type { IO, UIO } from '../core'

import { track } from '../../Supervisor'
import { bind_, descriptor, map_, supervised_ } from '../core'

export function withChildren<R, E, A>(
  get: (_: UIO<ReadonlyArray<RuntimeFiber<any, any>>>) => IO<R, E, A>
): IO<R, E, A> {
  return bind_(track, (supervisor) =>
    supervised_(
      get(bind_(supervisor.value, (children) => map_(descriptor(), (d) => children.filter((_) => _.id !== d.id)))),
      supervisor
    )
  )
}

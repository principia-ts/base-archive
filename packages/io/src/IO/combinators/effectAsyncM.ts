import type { IO } from '../core'

import { pipe } from '@principia/base/function'

import * as P from '../../Promise'
import * as I from '../core'
import { runtime } from '../runtime'
import { uninterruptibleMask } from './interrupt'
import { to } from './to'

/**
 * Imports an asynchronous effect into an `IO`. This formulation is
 * necessary when the effect is itself expressed in terms of `IO`.
 */
export function effectAsyncM<R, E, R1, E1, A>(
  register: (k: (_: IO<R1, E1, A>) => void) => IO<R, E, any>
): IO<R & R1, E | E1, A> {
  return I.gen(function* (_) {
    const p = yield* _(P.make<E | E1, A>())
    const r = yield* _(runtime<R & R1>())
    const a = yield* _(
      uninterruptibleMask(({ restore }) =>
        pipe(
          register((k) => {
            r.run_(to(p)(k))
          }),
          I.catchAllCause((c) => p.halt(c)),
          restore,
          I.fork,
          I.apr(restore(p.await))
        )
      )
    )
    return a
  })
}

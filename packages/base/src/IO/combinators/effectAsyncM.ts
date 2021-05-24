// tracing: off

import type { IO } from '../core'

import { traceAs } from '@principia/compile/util'

import { pipe } from '../../function'
import * as P from '../../Promise'
import * as I from '../core'
import { runtime } from '../runtime'
import { uninterruptibleMask } from './interrupt'
import { to } from './to'

/**
 * Imports an asynchronous effect into an `IO`. This formulation is
 * necessary when the effect is itself expressed in terms of `IO`.
 *
 * @trace 0
 */
export function effectAsyncM<R, E, R1, E1, A>(
  register: (k: (_: IO<R1, E1, A>) => void) => IO<R, E, any>
): IO<R & R1, E | E1, A> {
  return I.gen(function* (_) {
    const p = yield* _(P.make<E | E1, A>())
    const r = yield* _(runtime<R & R1>())
    const a = yield* _(
      uninterruptibleMask(
        traceAs(register, ({ restore }) =>
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
    )
    return a
  })
}

import type { Cause } from '../../Cause/core'
import type { IO } from '../core'

import { pipe } from '@principia/base/Function'

import * as P from '../../Promise'
import * as I from '../core'
import { uninterruptibleMask } from './interrupt'
import { runtime } from './runtime'
import { to } from './to'

/**
 * Imports an asynchronous effect into an `IO`. This formulation is
 * necessary when the effect is itself expressed in terms of `IO`.
 */
export function effectAsyncM<R, E, R1, E1, A>(
  register: (k: (_: IO<R1, E1, A>) => void) => IO<R, E, any>
): IO<R & R1, E | E1, A> {
  return pipe(
    I.do,
    I.bindS('p', () => P.make<E | E1, A>()),
    I.bindS('r', () => runtime<R & R1>()),
    I.bindS('a', ({ p, r }) =>
      uninterruptibleMask(({ restore }) =>
        pipe(
          I.fork(
            restore(
              pipe(
                register((k) => {
                  r.run(to(p)(k))
                }),
                I.catchAllCause((c) => p.halt(c as Cause<E | E1>))
              )
            )
          ),
          I.apSecond(restore(p.await))
        )
      )
    ),
    I.map(({ a }) => a)
  )
}

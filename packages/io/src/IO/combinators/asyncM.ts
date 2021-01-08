import type { Cause } from '../../Cause/core'
import type { IO } from '../core'

import { pipe } from '@principia/base/data/Function'

import * as P from '../../Promise'
import * as _ from '../core'
import { catchAllCause } from './catchAllCause'
import { uninterruptibleMask } from './interrupt'
import { runtime } from './runtime'
import { to } from './to'

/**
 * Imports an asynchronous effect into an `IO`. This formulation is
 * necessary when the effect is itself expressed in terms of `IO`.
 */
export function asyncM<R, E, R1, E1, A>(
  register: (resolve: (_: IO<R1, E1, A>) => void) => IO<R, E, any>
): IO<R & R1, E | E1, A> {
  return pipe(
    _.do,
    _.bindS('p', () => P.make<E | E1, A>()),
    _.bindS('r', () => runtime<R & R1>()),
    _.bindS('a', ({ p, r }) =>
      uninterruptibleMask(({ restore }) =>
        pipe(
          _.fork(
            restore(
              pipe(
                register((k) => {
                  r.run(to(p)(k))
                }),
                catchAllCause((c) => p.halt(c as Cause<E | E1>))
              )
            )
          ),
          _.apSecond(restore(p.await))
        )
      )
    ),
    _.map(({ a }) => a)
  )
}

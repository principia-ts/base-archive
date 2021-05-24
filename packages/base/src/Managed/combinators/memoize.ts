// tracing: off

import type { Managed, UManaged } from '../core'

import { accessCallTrace, traceFrom } from '@principia/compile/util'

import { pipe } from '../../function'
import { once } from '../../IO/combinators/once'
import { to } from '../../IO/combinators/to'
import * as P from '../../Promise'
import { fromEffect, mapM_ } from '../core'
import * as I from '../internal/io'
import { releaseMap } from './releaseMap'

/**
 * Returns a memoized version of the specified Managed.
 *
 * @trace call
 */
export function memoize<R, E, A>(ma: Managed<R, E, A>): UManaged<Managed<R, E, A>> {
  const trace = accessCallTrace()
  return mapM_(
    releaseMap(),
    traceFrom(trace, (finalizers) =>
      I.gen(function* (_) {
        const promise  = yield* _(P.make<E, A>())
        const complete = yield* _(
          once(
            I.asksM((r: R) =>
              pipe(
                ma.io,
                I.giveAll([r, finalizers] as const),
                I.map(([_, a]) => a),
                to(promise)
              )
            )
          )
        )
        return pipe(complete, I.apr(promise.await), fromEffect)
      })
    )
  )
}

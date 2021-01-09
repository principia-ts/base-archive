import type { Managed, UManaged } from '../core'

import { pipe } from '@principia/base/Function'

import * as P from '../../Promise'
import * as I from '../_internal/_io'
import { mapM_ } from '../core'
import { releaseMap } from './releaseMap'

/**
 * Returns a memoized version of the specified Managed.
 */
export function memoize<R, E, A>(ma: Managed<R, E, A>): UManaged<Managed<R, E, A>> {
  return mapM_(releaseMap, (finalizers) =>
    I.gen(function* (_) {
      const promise  = yield* _(P.make<E, A>())
      const complete = yield* _(
        I.once(
          I.asksM((r: R) =>
            pipe(
              ma.io,
              I.giveAll([r, finalizers] as const),
              I.map(([_, a]) => a),
              I.to(promise)
            )
          )
        )
      )
      return pipe(complete, I.apSecond(P.await(promise)), I.toManaged())
    })
  )
}

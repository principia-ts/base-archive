import { pipe, tuple } from '@principia/base/data/Function'

import { sequential } from '../../ExecutionStrategy'
import * as Ex from '../../Exit'
import * as I from '../_internal/io'
import { Managed } from '../core'
import * as RM from '../ReleaseMap'
import { releaseAll } from './releaseAll'

/**
 * Preallocates the managed resource, resulting in a Managed that reserves
 * and acquires immediately and cannot fail. You should take care that you
 * are not interrupted between running preallocate and actually acquiring
 * the resource as you might leak otherwise.
 */
export function preallocate<R, E, A>(ma: Managed<R, E, A>): I.IO<R, E, Managed<unknown, never, A>> {
  return I.uninterruptibleMask(({ restore }) =>
    pipe(
      I.do,
      I.bindS('releaseMap', () => RM.make),
      I.bindS('tp', ({ releaseMap }) =>
        pipe(
          ma.io,
          I.gives((r: R) => tuple(r, releaseMap)),
          restore,
          I.result
        )
      ),
      I.bindS('preallocated', ({ releaseMap, tp }) =>
        Ex.foldM_(
          tp,
          (c) => pipe(releaseMap, releaseAll(Ex.failure(c), sequential), I.apSecond(I.halt(c))),
          ([release, a]) =>
            I.succeed(
              new Managed(
                I.asksM(([_, releaseMap]: readonly [unknown, RM.ReleaseMap]) =>
                  pipe(
                    releaseMap,
                    RM.add(release),
                    I.map((_) => tuple(_, a))
                  )
                )
              )
            )
        )
      ),
      I.map(({ preallocated }) => preallocated)
    )
  )
}

/**
 * Preallocates the managed resource inside an outer Managed, resulting in a
 * Managed that reserves and acquires immediately and cannot fail.
 */
export function preallocateManaged<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, Managed<unknown, never, A>> {
  return new Managed(
    I.map_(ma.io, ([release, a]) => [
      release,
      new Managed(
        I.asksM(([_, releaseMap]: readonly [unknown, RM.ReleaseMap]) =>
          pipe(
            releaseMap,
            RM.add(release),
            I.map((_) => tuple(_, a))
          )
        )
      )
    ])
  )
}

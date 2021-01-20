import { pipe, tuple } from '@principia/base/Function'

import { sequential } from '../../ExecutionStrategy'
import * as Ex from '../../Exit'
import { Managed } from '../core'
import * as I from '../internal/io'
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
    I.gen(function* (_) {
      const rm = yield* _(RM.make)
      const tp = yield* _(
        pipe(
          ma.io,
          I.gives((r: R) => tuple(r, rm)),
          restore,
          I.result
        )
      )

      const preallocated = yield* _(
        Ex.foldM_(
          tp,
          (c) => pipe(rm, releaseAll(Ex.halt(c), sequential), I.andThen(I.halt(c))),
          ([release, a]) =>
            I.succeed(
              new Managed(
                I.asksM(([_, relMap]: readonly [unknown, RM.ReleaseMap]) =>
                  pipe(
                    relMap,
                    RM.add(release),
                    I.map((fin) => tuple(fin, a))
                  )
                )
              )
            )
        )
      )
      return preallocated
    })
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

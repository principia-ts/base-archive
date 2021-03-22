import type { Clock } from '../../Clock'
import type { Has } from '@principia/base/Has'

import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { tuple } from '@principia/base/tuple'

import { sequential } from '../../ExecutionStrategy'
import * as Ex from '../../Exit'
import { Managed } from '../core'
import * as I from '../internal/_io'
import * as RM from '../ReleaseMap'
import { releaseAll } from './releaseAll'

export function timeout(d: number) {
  return <R, E, A>(ma: Managed<R, E, A>): Managed<R & Has<Clock>, E, O.Option<A>> =>
    new Managed(
      I.uninterruptibleMask(({ restore }) =>
        I.gen(function* (_) {
          const [r, outerReleaseMap] = yield* _(I.ask<readonly [R & Has<Clock>, RM.ReleaseMap]>())
          const innerReleaseMap      = yield* _(RM.make)
          const earlyRelease         = yield* _(
            pipe(
              outerReleaseMap,
              RM.add((ex) => releaseAll(ex, sequential)(innerReleaseMap))
            )
          )

          const id         = yield* _(I.fiberId())
          const raceResult = yield* _(
            pipe(
              ma.io,
              I.giveAll(tuple(r, innerReleaseMap)),
              I.raceWith(
                pipe(
                  I.sleep(d),
                  I.as(() => O.None())
                ),
                (result, sleeper) =>
                  pipe(sleeper.interruptAs(id), I.apr(I.done(Ex.map_(result, ([, a]) => E.Right(a))))),
                (_, resultFiber) => I.succeed(E.Left(resultFiber))
              ),
              I.giveAll(r),
              restore
            )
          )
          const a          = yield* _(
            E.match_(
              raceResult,
              (fiber) =>
                pipe(
                  fiber.interruptAs(id),
                  I.ensuring(pipe(innerReleaseMap, releaseAll(Ex.interrupt(id), sequential))),
                  I.forkDaemon,
                  I.as(() => O.None())
                ),
              flow(O.Some, I.succeed)
            )
          )
          return tuple(earlyRelease, a)
        })
      )
    )
}

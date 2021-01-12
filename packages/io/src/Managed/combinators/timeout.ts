import type { Clock } from '../../Clock'
import type { Has } from '@principia/base/Has'

import * as E from '@principia/base/Either'
import { flow, pipe, tuple } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import { sequential } from '../../ExecutionStrategy'
import * as Ex from '../../Exit'
import * as I from '../_internal/_io'
import { Managed } from '../core'
import * as RM from '../ReleaseMap'
import { releaseAll } from './releaseAll'

export function timeout(d: number) {
  return <R, E, A>(ma: Managed<R, E, A>): Managed<R & Has<Clock>, E, O.Option<A>> =>
    new Managed(
      I.uninterruptibleMask(
        ({ restore }) =>
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
                    I.as(() => O.none())
                  ),
                  (result, sleeper) =>
                    pipe(sleeper.interruptAs(id), I.andThen(I.done(Ex.map_(result, ([, a]) => E.right(a))))),
                  (_, resultFiber) => I.succeed(E.left(resultFiber))
                ),
                I.giveAll(r),
                restore
              )
            )
            const a          = yield* _(
              E.fold_(
                raceResult,
                (fiber) =>
                  pipe(
                    fiber.interruptAs(id),
                    I.ensuring(pipe(innerReleaseMap, releaseAll(Ex.interrupt(id), sequential))),
                    I.forkDaemon,
                    I.as(() => O.none())
                  ),
                flow(O.some, I.succeed)
              )
            )
            return tuple(earlyRelease, a)
          })
      )
    )
}

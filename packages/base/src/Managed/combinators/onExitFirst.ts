// tracing: off

import type { Exit } from '../../Exit'
import type { ReleaseMap } from '../ReleaseMap'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import { sequential } from '../../ExecutionStrategy'
import * as Ex from '../../Exit'
import { flow, pipe } from '../../function'
import { tuple } from '../../tuple'
import { Managed } from '../core'
import * as I from '../internal/io'
import { add, make } from '../ReleaseMap'
import { releaseAll_ } from './releaseAll'

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 *
 * @trace call
 * @trace 1
 */
export function onExitFirst_<R, E, A, R1>(
  self: Managed<R, E, A>,
  cleanup: (exit: Exit<E, A>) => I.IO<R1, never, any>
): Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return new Managed<R & R1, E, A>(
    I.uninterruptibleMask(
      traceFrom(trace, ({ restore }) =>
        I.gen(function* (_) {
          const [r, outerReleaseMap] = yield* _(I.ask<readonly [R & R1, ReleaseMap]>())
          const innerReleaseMap      = yield* _(make)
          const exitEA               = yield* _(
            pipe(
              self.io,
              I.map(([, a]) => a),
              I.result,
              I.giveAll(tuple(r, innerReleaseMap)),
              restore
            )
          )
          const releaseMapEntry      = yield* _(
            add(outerReleaseMap, (e) =>
              pipe(
                cleanup(exitEA),
                I.giveAll(r),
                I.result,
                I.crossWith(
                  I.result(releaseAll_(innerReleaseMap, e, sequential)),
                  traceAs(cleanup, flow(Ex.apr_, I.doneNow))
                ),
                I.flatten
              )
            )
          )

          const a = yield* _(I.doneNow(exitEA))
          return tuple(releaseMapEntry, a)
        })
      )
    )
  )
}

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 *
 * @dataFirst onExitFirst_
 * @trace call
 * @trace 0
 */
export function onExitFirst<E, A, R1>(
  cleanup: (exit: Exit<E, A>) => I.IO<R1, never, any>
): <R>(self: Managed<R, E, A>) => Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return (self) => traceCall(onExitFirst_, trace)(self, cleanup)
}

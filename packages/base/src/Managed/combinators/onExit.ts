// tracing: off

import type { Exit } from '../../Exit'
import type { ReleaseMap } from '../ReleaseMap'

import { accessCallTrace, traceAs, traceCall, traceFrom } from '@principia/compile/util'

import { sequential } from '../../ExecutionStrategy'
import * as Ex from '../../Exit'
import { pipe } from '../../function'
import { tuple } from '../../tuple'
import { Managed } from '../core'
import * as I from '../internal/io'
import { add, make } from '../ReleaseMap'
import { releaseAll_ } from './releaseAll'

/**
 * Ensures that a cleanup function runs when this Managed is finalized, after
 * the existing finalizers.
 *
 * @trace call
 * @trace 1
 */
export function onExit_<R, E, A, R1>(self: Managed<R, E, A>, cleanup: (exit: Exit<E, A>) => I.IO<R1, never, any>) {
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
                releaseAll_(innerReleaseMap, e, sequential),
                I.result,
                I.crossWith(pipe(cleanup(exitEA), I.giveAll(r), I.result), traceAs(cleanup, Ex.apr_))
              )
            )
          )
          const a                    = yield* _(I.doneNow(exitEA))
          return tuple(releaseMapEntry, a)
        })
      )
    )
  )
}

/**
 * Ensures that a cleanup function runs when this Managed is finalized, after
 * the existing finalizers.
 *
 * @dataFirst onExit_
 * @trace call
 * @trace 0
 */
export function onExit<E, A, R1>(
  cleanup: (exit: Exit<E, A>) => I.IO<R1, never, any>
): <R>(self: Managed<R, E, A>) => Managed<R & R1, E, A> {
  const trace = accessCallTrace()
  return (self) => traceCall(onExit_, trace)(self, cleanup)
}

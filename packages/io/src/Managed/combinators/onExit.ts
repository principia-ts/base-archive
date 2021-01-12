import type { Exit } from '../../Exit'
import type { ReleaseMap } from '../ReleaseMap'

import { pipe, tuple } from '@principia/base/Function'

import { sequential } from '../../ExecutionStrategy'
import * as Ex from '../../Exit'
import * as I from '../_internal/io'
import { Managed } from '../core'
import { add, make } from '../ReleaseMap'
import { releaseAll } from './releaseAll'

/**
 * Ensures that a cleanup function runs when this Managed is finalized, after
 * the existing finalizers.
 */
export function onExit_<R, E, A, R1>(self: Managed<R, E, A>, cleanup: (exit: Exit<E, A>) => I.IO<R1, never, any>) {
  return new Managed<R & R1, E, A>(
    I.uninterruptibleMask(({ restore }) =>
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
          add((e) =>
            pipe(
              releaseAll(e, sequential)(innerReleaseMap),
              I.result,
              I.map2(pipe(cleanup(exitEA), I.giveAll(r), I.result), Ex.apSecond_)
            )
          )(outerReleaseMap)
        )
        const a                    = yield* _(I.done(exitEA))
        return tuple(releaseMapEntry, a)
      })
    )
  )
}

/**
 * Ensures that a cleanup function runs when this Managed is finalized, after
 * the existing finalizers.
 */
export function onExit<E, A, R1>(
  cleanup: (exit: Exit<E, A>) => I.IO<R1, never, any>
): <R>(self: Managed<R, E, A>) => Managed<R & R1, E, A> {
  return (self) => onExit_(self, cleanup)
}

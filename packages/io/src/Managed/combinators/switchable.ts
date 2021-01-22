import type { Managed } from '../core'

import { pipe, tuple } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import { sequential } from '../../ExecutionStrategy'
import * as Ex from '../../Exit'
import * as M from '../core'
import * as I from '../internal/io'
import * as RelMap from '../ReleaseMap'
import { releaseAll } from './releaseAll'
import { releaseMap } from './releaseMap'

/**
 * Returns a `Managed` value that represents a managed resource that can
 * be safely swapped within the scope of the `Managed`. The function provided
 * inside the `Managed` can be used to switch the resource currently in use.
 *
 * When the resource is switched, the finalizer for the previous finalizer will
 * be executed uninterruptibly. If the effect executing inside the `use`
 * is interrupted, the finalizer for the resource currently in use is guaranteed
 * to execute.
 *
 * This constructor can be used to create an expressive control flow that uses
 * several instances of a managed resource.
 */
export function switchable<R, E, A>(): Managed<R, never, (x: Managed<R, E, A>) => I.IO<R, E, A>> {
  return M.gen(function* (_) {
    const rm  = yield* _(releaseMap)
    const key = yield* _(
      pipe(
        rm,
        RelMap.addIfOpen((_) => I.unit()),
        I.bind(O.fold(() => I.interrupt, I.succeed)),
        M.fromEffect
      )
    )
    return (newResource: Managed<R, E, A>) =>
      I.uninterruptibleMask(({ restore }) =>
        I.gen(function* (_) {
          yield* _(
            pipe(
              rm,
              RelMap.replace(key, (_) => I.unit()),
              I.bind(
                O.fold(
                  () => I.unit(),
                  (fin) => fin(Ex.unit())
                )
              )
            )
          )
          const r     = yield* _(I.ask<R>())
          const inner = yield* _(RelMap.make)
          const a     = yield* _(pipe(newResource.io, I.giveAll(tuple(r, inner)), restore))
          yield* _(RelMap.replace(key, (exit) => releaseAll(exit, sequential)(inner))(rm))
          return a[1]
        })
      )
  })
}

import type { Scope } from '../../Scope'
import type { IO } from '../core'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import * as F from '../../Fiber'
import { flatMap } from '../core'
import { forkDaemon } from './core-scope'
import { onInterrupt, uninterruptibleMask } from './interrupt'

/**
 * Returns a new effect whose scope will be extended by the specified scope.
 * This means any finalizers associated with the effect will not be executed
 * until the specified scope is closed.
 */
export function in_<R, E, A>(io: IO<R, E, A>, scope: Scope<any>): IO<R, E, A> {
  return uninterruptibleMask(({ restore }) =>
    pipe(
      io,
      restore,
      forkDaemon,
      flatMap((executor) =>
        pipe(
          scope.extend(executor.scope),
          flatMap(() =>
            pipe(
              restore(F.join(executor)),
              onInterrupt((interruptors) =>
                pipe(
                  Array.from(interruptors),
                  A.head,
                  O.fold(
                    () => F.interrupt(executor),
                    (id) => executor.interruptAs(id)
                  )
                )
              )
            )
          )
        )
      )
    )
  )
}

/**
 * Returns a new effect whose scope will be extended by the specified scope.
 * This means any finalizers associated with the effect will not be executed
 * until the specified scope is closed.
 */
function _in(scope: Scope<any>): <R, E, A>(io: IO<R, E, A>) => IO<R, E, A> {
  return (io) => in_(io, scope)
}

export { _in as in }

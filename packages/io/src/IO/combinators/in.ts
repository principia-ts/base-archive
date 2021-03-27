import type { Scope } from '../../Scope'
import type { IO } from '../core'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import { accessCallTrace, traceCall, traceFrom } from '@principia/compile/util'

import * as F from '../../Fiber'
import { bind } from '../core'
import { forkDaemon } from './core-scope'
import { onInterrupt, uninterruptibleMask } from './interrupt'

/**
 * Returns a new effect whose scope will be extended by the specified scope.
 * This means any finalizers associated with the effect will not be executed
 * until the specified scope is closed.
 *
 * @trace call
 */
export function in_<R, E, A>(io: IO<R, E, A>, scope: Scope<any>): IO<R, E, A> {
  const trace = accessCallTrace()
  return uninterruptibleMask(
    traceFrom(trace, ({ restore }) =>
      pipe(
        io,
        restore,
        forkDaemon,
        bind((executor) =>
          pipe(
            scope.extend(executor.scope),
            bind(() =>
              pipe(
                restore(F.join(executor)),
                onInterrupt((interruptors) =>
                  pipe(
                    Array.from(interruptors),
                    A.head,
                    O.match(
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
  )
}

/**
 * Returns a new effect whose scope will be extended by the specified scope.
 * This means any finalizers associated with the effect will not be executed
 * until the specified scope is closed.
 *
 * @trace call
 */
function _in(scope: Scope<any>): <R, E, A>(io: IO<R, E, A>) => IO<R, E, A> {
  const trace = accessCallTrace()
  return (io) => traceCall(in_, trace)(io, scope)
}

export { _in as in }

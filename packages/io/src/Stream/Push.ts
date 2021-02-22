import type { Cause } from '../Cause'
import type { Managed } from '../Managed'
import type * as O from '@principia/base/Option'

import * as E from '@principia/base/Either'

import * as A from '../Array'
import * as I from '../IO'
import * as XR from '../IORef'
import * as M from '../Managed'

export type Push<R, E, I, L, Z> = (
  _: O.Option<ReadonlyArray<I>>
) => I.IO<R, readonly [E.Either<E, Z>, ReadonlyArray<L>], void>

export function emit<I, Z>(z: Z, leftover: ReadonlyArray<I>): I.FIO<[E.Either<never, Z>, ReadonlyArray<I>], never> {
  return I.fail([E.Right(z), leftover])
}

export const more = I.unit()

export function fail<E, I>(e: E, leftover: ReadonlyArray<I>): I.FIO<[E.Either<E, never>, ReadonlyArray<I>], never> {
  return I.fail([E.Left(e), leftover])
}

export function halt<E>(c: Cause<E>): I.FIO<[E.Either<E, never>, ReadonlyArray<never>], never> {
  return I.mapError_(I.halt(c), (e) => [E.Left(e), A.empty()])
}

export function restartable<R, E, I, L, Z>(
  sink: Managed<R, never, Push<R, E, I, L, Z>>
): Managed<R, never, readonly [Push<R, E, I, L, Z>, I.URIO<R, void>]> {
  return M.gen(function* (_) {
    const switchSink  = yield* _(M.switchable<R, never, Push<R, E, I, L, Z>>())
    const initialSink = yield* _(switchSink(sink))
    const currSink    = yield* _(XR.make(initialSink))

    const restart = I.bind_(switchSink(sink), currSink.set)
    const push    = (input: O.Option<ReadonlyArray<I>>) => I.bind_(currSink.get, (f) => f(input))

    return [push, restart]
  })
}

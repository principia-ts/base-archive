import type { Cause } from '../../Cause/core'
import type { IO } from '../core'

import * as E from '@principia/base/data/Either'
import { flow } from '@principia/base/data/Function'

import * as C from '../../Cause/core'
import * as Ex from '../../Exit'
import * as I from '../core'
import { bracketExit_ } from './bracketExit'

export function onTermination_<R, E, A, R1>(
  io: IO<R, E, A>,
  onTerminated: (cause: Cause<never>) => I.URIO<R1, any>
): IO<R & R1, E, A> {
  return bracketExit_(
    I.unit(),
    () => io,
    (_, exit) =>
      Ex.fold_(
        exit,
        flow(
          C.failureOrCause,
          E.fold(() => I.unit(), onTerminated)
        ),
        () => I.unit()
      )
  )
}

export function onTermination<R1>(
  onTerminated: (cause: Cause<never>) => I.URIO<R1, any>
): <R, E, A>(io: I.IO<R, E, A>) => I.IO<R & R1, E, A> {
  return (io) => onTermination_(io, onTerminated)
}

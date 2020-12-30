import type { IO } from '../core'

import * as E from '@principia/base/data/Either'
import { flow, pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import * as C from '../../Cause/core'
import { foldCauseM_, halt, succeed } from '../core'

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  f: (e: E) => O.Option<IO<R1, E1, A1>>
): IO<R & R1, E | E1, A | A1> {
  return foldCauseM_(
    fa,
    (cause): IO<R1, E | E1, A1> =>
      pipe(
        cause,
        C.failureOrCause,
        E.fold(
          flow(
            f,
            O.getOrElse(() => halt(cause))
          ),
          halt
        )
      ),
    succeed
  )
}

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome<E, R1, E1, A1>(
  f: (e: E) => O.Option<IO<R1, E1, A1>>
): <R, A>(fa: IO<R, E, A>) => IO<R & R1, E | E1, A | A1> {
  return (fa) => catchSome_(fa, f)
}

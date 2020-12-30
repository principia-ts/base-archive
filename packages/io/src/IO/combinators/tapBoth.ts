import type { IO } from '../core'

import * as E from '@principia/base/data/Either'

import * as C from '../../Cause/core'
import { flatMap_, foldCauseM_, halt } from '../core'

/**
 * Returns an IO that effectfully "peeks" at the failure or success of
 * this effect.
 */
export function tapBoth_<R, E, A, R1, E1, R2, E2>(
  fa: IO<R, E, A>,
  onFailure: (e: E) => IO<R1, E1, any>,
  onSuccess: (a: A) => IO<R2, E2, any>
) {
  return foldCauseM_(
    fa,
    (c) =>
      E.fold_(
        C.failureOrCause(c),
        (e) => flatMap_(onFailure(e), () => halt(c)),
        (_) => halt(c)
      ),
    onSuccess
  )
}

/**
 * Returns an IO that effectfully "peeks" at the failure or success of
 * this effect.
 */
export function tapBoth<E, A, R1, E1, R2, E2>(
  onFailure: (e: E) => IO<R1, E1, any>,
  onSuccess: (a: A) => IO<R2, E2, any>
): <R>(fa: IO<R, E, A>) => IO<R & R1 & R2, E | E1 | E2, any> {
  return (fa) => tapBoth_(fa, onFailure, onSuccess)
}

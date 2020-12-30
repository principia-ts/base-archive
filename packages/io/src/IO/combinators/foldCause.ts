import type { Cause } from '../../Cause/core'
import type { IO } from '../core'

import { flow } from '@principia/base/data/Function'

import { foldCauseM_, pure } from '../core'

/**
 * A more powerful version of `fold_` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause_<R, E, A, A1, A2>(
  ef: IO<R, E, A>,
  onFailure: (cause: Cause<E>) => A1,
  onSuccess: (a: A) => A2
): IO<R, never, A1 | A2> {
  return foldCauseM_(ef, flow(onFailure, pure), flow(onSuccess, pure))
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause<E, A, A1, A2>(
  onFailure: (cause: Cause<E>) => A1,
  onSuccess: (a: A) => A2
): <R>(ef: IO<R, E, A>) => IO<R, never, A1 | A2> {
  return (ef) => foldCause_(ef, onFailure, onSuccess)
}

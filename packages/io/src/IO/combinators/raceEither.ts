import type { IO } from '../core'
import type { Either } from '@principia/base/Either'

import * as E from '@principia/base/Either'

import * as I from '../core'
import { race_ } from './race'

/**
 * Returns an IO that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function raceEither_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  that: IO<R1, E1, A1>
): IO<R & R1, E | E1, Either<A, A1>> {
  return race_(I.map_(fa, E.left), I.map_(that, E.right))
}

/**
 * Returns an IO that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function raceEither<R1, E1, A1>(
  that: IO<R1, E1, A1>
): <R, E, A>(fa: IO<R, E, A>) => IO<R & R1, E1 | E, Either<A, A1>> {
  return (fa) => raceEither_(fa, that)
}

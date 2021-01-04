import type { IO } from '../core'

import { summarized_ } from './summarized'

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export function timedWith_<R, E, A, R1, E1>(ma: IO<R, E, A>, msTime: IO<R1, E1, number>) {
  return summarized_(ma, msTime, (start, end) => end - start)
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 */
export function timedWith<R1, E1>(
  msTime: IO<R1, E1, number>
): <R, E, A>(ma: IO<R, E, A>) => IO<R & R1, E1 | E, [number, A]> {
  return (ma) => timedWith_(ma, msTime)
}

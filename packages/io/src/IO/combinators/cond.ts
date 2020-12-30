import type { IO, URIO } from '../core'

import { flatMap_, suspend } from '../core'

export function cond_<R, R1, E, A>(b: boolean, onTrue: () => URIO<R, A>, onFalse: () => URIO<R1, E>): IO<R & R1, E, A> {
  return suspend((): IO<R & R1, E, A> => (b ? onTrue() : flatMap_(onFalse(), fail)))
}

export function cond<R, R1, E, A>(
  onTrue: () => URIO<R, A>,
  onFalse: () => URIO<R1, E>
): (b: boolean) => IO<R & R1, E, A> {
  return (b) => cond_(b, onTrue, onFalse)
}

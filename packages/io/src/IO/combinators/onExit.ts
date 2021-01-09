import type { Exit } from '../../Exit'
import type { IO } from '../core'

import { unit } from '../core'
import { bracketExit_ } from './bracketExit'

export function onExit_<R, E, A, R2, E2>(
  self: IO<R, E, A>,
  cleanup: (exit: Exit<E, A>) => IO<R2, E2, any>
): IO<R & R2, E | E2, A> {
  return bracketExit_(
    unit(),
    () => self,
    (_, e) => cleanup(e)
  )
}

export function onExit<E, A, R2, E2>(cleanup: (exit: Exit<E, A>) => IO<R2, E2, any>) {
  return <R>(self: IO<R, E, A>): IO<R & R2, E | E2, A> => onExit_(self, cleanup)
}

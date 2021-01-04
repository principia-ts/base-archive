import type { IO } from '../core'

import { pure } from '../core'
import { orElse_ } from './orElse'

export function orElseSucceed_<R, E, A, A1>(ma: IO<R, E, A>, a: A1): IO<R, E, A | A1> {
  return orElse_(ma, () => pure(a))
}

export function orElseSucceed<A1>(a: A1): <R, E, A>(self: IO<R, E, A>) => IO<R, E, A1 | A> {
  return (self) => orElseSucceed_(self, a)
}

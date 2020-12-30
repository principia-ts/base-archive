import type { IO } from '../core'

import * as O from '@principia/base/data/Option'

import { fail, flatMap_, succeed, total } from '../core'

export function require_<R, E, A>(ma: IO<R, E, O.Option<A>>, error: () => E): IO<R, E, A> {
  return flatMap_(
    ma,
    O.fold(() => flatMap_(total(error), fail), succeed)
  )
}

function _require<E>(error: () => E): <R, A>(ma: IO<R, E, O.Option<A>>) => IO<R, E, A> {
  return (ma) => require_(ma, error)
}

export { _require as require }

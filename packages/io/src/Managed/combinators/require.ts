import type { Managed } from '../core'

import * as O from '@principia/base/data/Option'

import { chain_, fail, succeed, total } from '../core'

export function require_<R, E, A>(ma: Managed<R, E, O.Option<A>>, error: () => E): Managed<R, E, A> {
  return chain_(
    ma,
    O.fold(() => chain_(total(error), fail), succeed)
  )
}

function _require<E>(error: () => E): <R, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E, A> {
  return (ma) => require_(ma, error)
}
export { _require as require }

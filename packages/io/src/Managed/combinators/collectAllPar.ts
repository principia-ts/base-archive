import type { Managed } from '../core'

import { identity } from '@principia/base/function'

import { foreachPar_, foreachUnitPar_ } from './foreachPar'

export function collectAllPar<R, E, A>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, ReadonlyArray<A>> {
  return foreachPar_(mas, identity)
}

export function collectAllUnitPar<R, E, A>(mas: Iterable<Managed<R, E, A>>): Managed<R, E, void> {
  return foreachUnitPar_(mas, identity)
}

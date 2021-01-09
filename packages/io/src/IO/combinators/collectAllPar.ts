import type { IO } from '../core'

import { identity } from '@principia/base/data/Function'

import { foreachPar_ } from './foreachPar'
import { foreachUnitPar_ } from './foreachUnitPar'

export function collectAllPar<R, E, A>(mas: Iterable<IO<R, E, A>>): IO<R, E, readonly A[]> {
  return foreachPar_(mas, identity)
}

export function collectAllUnitPar<R, E, A>(mas: Iterable<IO<R, E, A>>): IO<R, E, void> {
  return foreachUnitPar_(mas, identity)
}

import type { IO } from '../core'

import { identity } from '@principia/base/Function'

import { foreachParN_ } from './foreachParN'
import { foreachUnitParN_ } from './foreachUnitParN'

export function collectAllParN(n: number): <R, E, A>(mas: Iterable<IO<R, E, A>>) => IO<R, E, readonly A[]> {
  return (mas) => foreachParN_(n)(mas, identity)
}

export function collectAllUnitParN(n: number): <R, E, A>(mas: Iterable<IO<R, E, A>>) => IO<R, E, void> {
  return (mas) => foreachUnitParN_(n)(mas, identity)
}

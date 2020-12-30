import type { IO } from '../core'

import { identity } from '@principia/base/data/Function'

import { foreachParN_ } from './foreachParN'
import { foreachUnitParN_ } from './foreachUnitParN'

export function collectAllParN(n: number): <R, E, A>(efs: Iterable<IO<R, E, A>>) => IO<R, E, readonly A[]> {
  return (efs) => foreachParN_(n)(efs, identity)
}

export function collectAllUnitParN(n: number): <R, E, A>(efs: Iterable<IO<R, E, A>>) => IO<R, E, void> {
  return (efs) => foreachUnitParN_(n)(efs, identity)
}

import type { IO } from '../core'

import { identity } from '@principia/base/data/Function'

import { foreach_, foreachUnit_ } from '../core'

export function collectAll<R, E, A>(efs: Iterable<IO<R, E, A>>): IO<R, E, readonly A[]> {
  return foreach_(efs, identity)
}

export function collectAllUnit<R, E, A>(efs: Iterable<IO<R, E, A>>): IO<R, E, void> {
  return foreachUnit_(efs, identity)
}

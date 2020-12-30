import type { Stream } from '../core'
import type { Option } from '@principia/base/data/Option'

import { flow } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import * as I from '../../IO'
import { unfoldChunkM } from './unfoldChunkM'

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldM<R, E, O, Z>(z: Z, f: (z: Z) => I.IO<R, E, Option<readonly [O, Z]>>): Stream<R, E, O> {
  return unfoldChunkM(z, flow(f, I.map(O.map(([o, z]) => [[o], z]))))
}

// Contract notes for transducers:
// - When a None is received, the transducer must flush all of its internal state
//   and remain empty until subsequent Some(Chunk) values.
//
//   Stated differently, after a first push(None), all subsequent push(None) must

import type { Chunk } from '../../Chunk'
import type { IO } from '../../IO'
import type { Managed } from '../../Managed'
import type { Option } from '@principia/base/Option'

//   result in empty [].
export class Transducer<R, E, I, O> {
  constructor(readonly push: Managed<R, never, (c: Option<Chunk<I>>) => IO<R, E, Chunk<O>>>) {}
}

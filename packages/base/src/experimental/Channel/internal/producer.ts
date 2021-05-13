import type { Cause } from '../../../Cause'
import type { Either } from '../../../Either'
import type { Exit } from '../../../Exit'
import type { UIO } from '../../../IO'

import * as Ca from '../../../Cause'
import * as E from '../../../Either'
import * as Ex from '../../../Exit'
import * as T from '../../../IO'
import * as P from '../../../Promise'
import * as Ref from '../../../Ref'
import { tuple } from '../../../tuple'

export interface AsyncInputProducer<Err, Elem, Done> {
  emit(el: Elem): UIO<unknown>
  done(a: Done): UIO<unknown>
  error(cause: Cause<Err>): UIO<unknown>
}

/**
 * Consumer-side view of `SingleProducerAsyncInput` for variance purposes.
 */
export interface AsyncInputConsumer<Err, Elem, Done> {
  takeWith<A>(onError: (cause: Cause<Err>) => A, onElement: (element: Elem) => A, onDone: (done: Done) => A): UIO<A>
}

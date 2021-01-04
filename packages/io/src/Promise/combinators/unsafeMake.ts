import type { FiberId } from '../../Fiber/FiberId'

import { AtomicReference } from '@principia/base/util/support/AtomicReference'

import { Pending, Promise } from '../model'

export function unsafeMake<E, A>(fiberId: FiberId) {
  return new Promise<E, A>(new AtomicReference(new Pending([])), [fiberId])
}

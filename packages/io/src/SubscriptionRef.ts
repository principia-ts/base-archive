import type { URefM } from './IORefM'

import { pipe } from '@principia/base/function'

import * as I from './IO'
import * as RefM from './IORefM'
import * as S from './Stream'

export class SubscriptionRef<A> {
  constructor(readonly ref: URefM<A>, readonly changed: S.UStream<A>) {}
}

export function make<A>(a: A): I.UIO<SubscriptionRef<A>> {
  return pipe(
    RefM.dequeueRefM(a),
    I.map(([ref, queue]) => new SubscriptionRef(ref, S.fromQueue(queue)))
  )
}

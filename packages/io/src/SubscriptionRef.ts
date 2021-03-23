import type { URefM } from './Ref'

import { pipe } from '@principia/base/function'

import * as I from './IO'
import * as Ref from './Ref'
import * as S from './Stream'

export class SubscriptionRef<A> {
  constructor(readonly ref: URefM<A>, readonly changed: S.UStream<A>) {}
}

export function make<A>(a: A): I.UIO<SubscriptionRef<A>> {
  return pipe(
    Ref.dequeueRefM(a),
    I.map(([ref, queue]) => new SubscriptionRef(ref, S.fromQueue(queue)))
  )
}

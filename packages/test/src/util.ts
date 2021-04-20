import type { FiberId, RuntimeFiber } from '@principia/base/Fiber'
import type { Eq } from '@principia/prelude/Eq'
import type { Hash } from '@principia/prelude/Hash'

import { eqFiberId } from '@principia/base/Fiber'
import * as EQ from '@principia/prelude/Eq'

export type WidenLiteral<A> = A extends string ? string : A extends number ? number : A extends boolean ? boolean : A

export const HashEqFiber: Hash<RuntimeFiber<any, any>> & Eq<RuntimeFiber<any, any>> = {
  ...EQ.contramap_(eqFiberId, (_) => _.id),
  hash: (_) => _.id.seqNumber
}

export const HashEqFiberId: Hash<FiberId> & Eq<FiberId> = {
  ...eqFiberId,
  hash: (_) => _.seqNumber
}

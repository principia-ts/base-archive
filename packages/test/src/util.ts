import type { Eq } from '@principia/base/Eq'
import type { Hash } from '@principia/base/Hash'
import type { FiberId,RuntimeFiber } from '@principia/io/Fiber'

import * as EQ from '@principia/base/Eq'
import { eqFiberId } from '@principia/io/Fiber'

export type WidenLiteral<A> = A extends string ? string : A extends number ? number : A extends boolean ? boolean : A

export const HashEqFiber: Hash<RuntimeFiber<any, any>> & Eq<RuntimeFiber<any, any>> = {
  ...EQ.contramap_(eqFiberId, (_) => _.id),
  hash: (_) => _.id.seqNumber
}

export const HashEqFiberId: Hash<FiberId> & Eq<FiberId> = {
  ...eqFiberId,
  hash: (_) => _.seqNumber
}

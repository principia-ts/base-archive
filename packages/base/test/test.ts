import { ordNumber } from '@principia/base/Ord'

import { pipe } from '../src/Function'
import * as RBT from '../src/RedBlackTree'

const t = pipe(
  RBT.make<number, string>(ordNumber),
  RBT.insert(0, 'zero'),
  RBT.insert(9, 'nine'),
  RBT.insert(5, 'five'),
  RBT.insert(-1, 'negative one'),
  RBT.lte(5)
)

const s = []
for (const [k, v] of t) {
  s.push([k, v])
}
console.log(s)

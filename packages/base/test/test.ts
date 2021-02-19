import { ordNumber } from '@principia/base/Ord'
import { inspect } from 'util'

import { pipe } from '../src/Function'
import { none } from '../src/Option'
import * as RBT from '../src/RedBlackTree'

const x: any[] = []

const t = pipe(
  RBT.make<number, string>(ordNumber),
  RBT.insert(0, 'zero'),
  RBT.insert(1, 'one'),
  RBT.insert(5, 'five'),
  RBT.insert(-1, 'negative one'),
  RBT.insert(-2, 'negative two'),
  RBT.insert(9, 'nine')
)

for (const kv of t) {
  x.push(kv)
}

console.log(x)

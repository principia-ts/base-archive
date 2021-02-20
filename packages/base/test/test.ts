import { ordNumber } from '@principia/base/Ord'
import { inspect } from 'util'

import * as A from '../src/Array'
import { pipe } from '../src/Function'
import { None } from '../src/Option'
import * as RBT from '../src/RedBlackTree'

const t = pipe(
  RBT.make<number, string>(ordNumber),
  RBT.insert(0, 'zero'),
  RBT.insert(-5, 'negative five'),
  RBT.insert(4, 'four'),
  RBT.insert(3, 'three'),
  RBT.insert(2, 'two'),
  RBT.insert(9, 'nine'),
  RBT.getGt(3)
)

console.log(t)

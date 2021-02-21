import { ordNumber, ordString } from '@principia/base/Ord'
import { inspect } from 'util'

import * as A from '../src/Array'
import { pipe } from '../src/Function'
import * as HM from '../src/HashMap'
import { None } from '../src/Option'
import * as OS from '../src/OrderedSet'

const s = pipe(
  OS.make(ordNumber),
  OS.add(-3),
  OS.add(2),
  OS.add(0),
  OS.add(-7),
  OS.add(6),
  OS.add(10),
  OS.bind(ordNumber)((n) => [n * 2, n * 3])
)

console.log(OS.foldl_(s, 0, (z, a) => z + a))

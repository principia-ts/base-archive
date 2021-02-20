import { ordNumber } from '@principia/base/Ord'
import { inspect } from 'util'

import * as A from '../src/Array'
import { pipe } from '../src/Function'
import { none } from '../src/Option'
import * as RBT from '../src/RedBlackTree'

const xs = [1, 2, 3]
const ys = [4, 5, 6, 7]

console.log(A.crossWith_(xs, ys, (x, y) => x + y))
console.log(A.zipWith_(xs, ys, (x, y) => x + y))
console.log(A.align_(xs, ys))

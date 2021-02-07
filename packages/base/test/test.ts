import { inspect } from 'util'

import { iterable } from '../src/Iterable'
import { ordNumber } from '../src/Ord'
import * as RBT from '../src/RedBlackTree'
import { semigroupString } from '../src/Semigroup'

const t  = new RBT.RedBlackTree<number, string>(ordNumber, null)
const t2 = RBT.insert_(t, 1, 'one')
const t3 = RBT.insert_(t2, 4, 'four')
const t4 = RBT.insert_(t3, 2, 'two')
const t5 = RBT.insert_(t4, 3, 'three')
const t6 = RBT.insertWith_(semigroupString)(t5, 4, ' and four again')
const t7 = RBT.insertWith_(semigroupString)(t6, 2, ' and two again')
const t8 = RBT.insert_(t7, 23, 'twenty-three')
const t9 = RBT.insert_(t8, 11, 'eleven')
const t10 = RBT.insert_(t9, 14, 'fourteen')

console.log(inspect(t10, { depth: 10 }))
console.log(RBT.blackHeight(t10.root))

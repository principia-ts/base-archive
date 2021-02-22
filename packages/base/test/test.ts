import { pipe } from '../src/Function'
import * as OS from '../src/OrderedSet'
import { ordNumber } from '../src/typeclass'

const xs = pipe(OS.make(ordNumber), OS.add(1), OS.add(2), OS.add(4), OS.add(6), OS.add(7))

const ys = pipe(OS.make(ordNumber), OS.add(2), OS.add(6), OS.add(8), OS.add(9))

const zs = OS.union_(xs, ys)

for (const a of zs) {
  console.log(a)
}

import { pipe } from '../src/Function'
import * as Iter from '../src/Iterable'

const x = Iter.range(0, 5)
const y = Iter.range(10, 20)

const xy = Iter.zip_(x, y)

for (const n of xy) {
  console.log(n)
}

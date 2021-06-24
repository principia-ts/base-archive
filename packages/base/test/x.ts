import * as A from '../src/Array'
import * as E from '../src/Either'
import { show } from '../src/Structural'
import { mapAccumMF_ } from '../src/Traversable'

const mapAccumM_ = mapAccumMF_(A.Traversable)

const as = A.range(0, 100000)

const x = mapAccumM_(E.Monad)(as, '', (s, n) => E.right([n + 1, s + n.toString()]))

console.log(show(x))

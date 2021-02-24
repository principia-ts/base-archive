import * as E from '../src/Either'
import { pipe } from '../src/Function'

const x = pipe(
  E.Right('A'),
  E.fcross((s) => s.length)
)

console.log(x)

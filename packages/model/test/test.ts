import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as S from '@principia/io/Sync'

import * as M from '../src'

const l = M.make((F) =>
  F.both(
    {
      a: F.string(),
      b: F.number(),
      d: F.tuple(F.string(), F.number(), F.boolean())()
    },
    { c: F.either(F.string(), F.number()) }
  )
)

const veryWrongInput = {
  a: 'string',
  b: 0,
  c: E.Left('boop'),
  d: ['hello', 12, true]
}

pipe(
  M.getDecoder(l).decode(veryWrongInput),
  S.runEither,
  E.match(
    (err) => console.log(err),
    (x) => console.log(x)
  )
)

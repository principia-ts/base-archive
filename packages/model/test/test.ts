import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/Function'
import * as DE from '@principia/codec/DecodeErrors'
import { runDecoder } from '@principia/codec/DecoderKF'
import { fromDecoderKF } from '@principia/codec/EitherDecoder'

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
  a: 0,
  b: 'bad',
  c: E.Left(42),
  d: ['hello', 'wrong', true]
}

pipe(
  M.getDecoder(l),
  fromDecoderKF,
  (d) => d.decode(veryWrongInput),
  E.match(
    (err) => console.log(DE.prettyPrint(err)),
    (x) => console.log(x)
  )
)

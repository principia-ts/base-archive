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
      b: F.number()
    },
    { c: F.either(F.string(), F.number()) }
  )
)

const input = {
  a: 'Hello, world',
  b: 42,
  c: E.right('left')
}

pipe(
  M.getDecoder(l),
  fromDecoderKF,
  (d) => d.decode(input),
  E.fold(
    (err) => console.log(DE.paths(err)),
    (x) => console.log(x)
  )
)

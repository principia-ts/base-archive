import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'
import { inspect } from 'util'

import { paths } from '../src/DecodeErrors'
import * as D from '../src/DecoderKF'
import { decode } from '../src/EitherDecoder'

const dec = D.type({
  a: D.string(),
  b: D.number(),
  c: D.type({
    d: D.boolean(),
    e: D.array(D.number()),
    f: D.type({
      g: pipe(
        D.number(),
        D.refine((n): n is number => n === 42, 'the meaning of life')
      )
    })
  })
})

export const badInput = {
  a: 12,
  b: 'wrong',
  c: {
    d: true,
    e: [1, 'wrong again', 3],
    f: {
      g: 43
    }
  }
}

pipe(
  badInput,
  decode(dec),
  E.fold(
    (e) => console.log(inspect(paths(e), { depth: 4, colors: true })),
    (a) => console.log(a)
  )
)

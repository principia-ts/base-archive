import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as T from '@principia/base/These'
import { inspect } from 'util'

import * as DE from '../src/DecodeError'
import * as D from '../src/Decoder'

const d1 = D.struct({
  a: D.struct({
    a1: D.string
  }),
  b: D.tuple(D.string, D.number, D.boolean)
})

const d2 = D.struct({
  a: D.struct({
    a2: D.number
  })
})

const d3 = D.struct({
  a: D.struct({
    a3: D.boolean
  })
})

const d4 = D.struct({
  a: D.struct({
    a4: D.array(D.string)
  })
})

const dI = D.intersect(d1, d2, d3, d4)

pipe(
  dI.decode({
    a: {
      a1: '',
      a2: 0,
      a4: ['kek', 'w']
    },
    b: ['b', 0, true],
  }),
  DE.debug
)

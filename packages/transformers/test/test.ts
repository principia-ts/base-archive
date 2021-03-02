import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'
import * as Mu from '@principia/io/Multi'

import * as MRT from '../src/MReaderT'

const M = MRT.getMReaderT(E.Monad)

const x = pipe(
  M.asks((_: { s: string }) => _.s),
  M.bind((a) => (a.length > 5 ? M.pure(a) : Mu.pure(E.Left('fail'))))
)

console.log(Mu.runEnv_(x, { s: 'helloo' }))

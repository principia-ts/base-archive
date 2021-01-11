import '@principia/base/unsafe/Operators'

import { tuple } from '@principia/base/Function'
import { Has, tag } from '@principia/base/Has'
import * as Iter from '@principia/base/Iterable'
import * as Str from '@principia/base/String'
import { inspect } from 'util'

import * as C from '../src/Console'
import * as I from '../src/IO'
import * as L from '../src/Layer'
import * as S from '../src/Stream'
import * as M from '../src/Managed'
import * as Sink from '../src/Stream/Sink'
import * as P from '../src/Promise'

export const program = I.gen(function* (_) {
  const acquireLatch = yield* _(P.make<never, void>())
  const releaseLatch = yield* _(P.make<never, void>())
  const managed = M.makeReserve(acquireLatch.await['|>'](I.andThen(I.succeed(M.makeReservation_(I.unit(), () => releaseLatch.succeed(undefined))))))
  const res = yield* _(M.timeout(0)(managed)['|>'](M.use(I.succeed)))
  yield* _(acquireLatch.succeed(undefined))
  yield* _(releaseLatch.await)
  return res
})

I.run(program, (_) => console.log(_))

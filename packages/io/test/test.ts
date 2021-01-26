import '@principia/base/unsafe/Operators'

import * as E from '@principia/base/Either'
import * as Ev from '@principia/base/Eval'
import { none, some } from '@principia/base/Option'
import Bench from 'benchmark'

import * as I from '../src/IO'
import * as Ref from '../src/IORef'
import * as P from '../src/Promise'
import * as Sc from '../src/Schedule'
import * as S from '../src/Stream'

/*
 * new Bench.Suite('Eval vs thunk')
 *   .add('eval', {
 *     defer: true,
 *     fn: async (defer: any) => {
 *       await I.runPromiseExit(I.lfromEither(Ev.always(() => E.right(123)['|>'](E.bind((n) => E.left('error'))))))
 *       defer.resolve()
 *     }
 *   })
 *   .add('thunk', {
 *     defer: true,
 *     fn: async (defer: any) => {
 *       await I.runPromiseExit(I.fromEither(() => E.right(123)['|>'](E.bind((n) => E.left('error')))))
 *       defer.resolve()
 *     }
 *   })
 *   .on('cycle', (event: any) => {
 *     console.log(String(event.target))
 *   })
 *   .run({ async: true })
 */

const program = I.gen(function* (_) {
  const ref   = yield* _(Ref.make(0))
  const latch = yield* _(P.make<never, void>())
  const id    = yield* _(I.fiberId())
  yield* _(I.effectTotal(() => console.time('A')))
  yield* _(
    I.repeat(Sc.spaced(10))(Ref.update_(ref, (n) => n + 1)['|>'](I.apr(I.effectTotal(() => console.timeLog('A')))))[
      '|>'
    ](I.fork)
  )
  return yield* _(I.eventually(ref.get['|>'](I.bind((n) => (n < 10 ? I.fail('not yet') : I.succeed(n))))))
})

I.run(I.timed(program), (ex) => console.log(ex))

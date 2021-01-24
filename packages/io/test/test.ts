import '@principia/base/unsafe/Operators'

import { none, some } from '@principia/base/Option'

import * as I from '../src/IO'
import * as Ref from '../src/IORef'
import * as Sc from '../src/Schedule'
import * as S from '../src/Stream'

const program = I.gen(function* (_) {
  const ref = yield* _(Ref.make(0))
  yield* _(I.effectTotal(() => console.time('A')))
  yield* _(
    I.repeat(Sc.spaced(10))(Ref.update_(ref, (n) => n + 1)['|>'](I.apl(I.effectTotal(() => console.timeLog('A')))))[
      '|>'
    ](I.fork)
  )
  return yield* _(I.eventually(ref.get['|>'](I.bind((n) => (n < 10 ? I.fail('not yet') : I.succeed(n))))))
})

I.run(I.timed(program), (ex) => console.log(ex))

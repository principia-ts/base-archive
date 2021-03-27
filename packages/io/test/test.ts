import '@principia/compile/enableTracing'

import { pipe } from '@principia/base/function'

import * as C from '../src/Cause'
import * as Ex from '../src/Exit'
import * as I from '../src/IO'

pipe(
  I.succeed('hello'),
  I.cross(I.succeed('world')),
  I.bind(([a, b]) => I.succeed(`${a}, ${b}`)),
  I.bind(I.fail),
  I.asSomeError,
  I.result,
  I.bind(
    Ex.match(
      (c) => I.effectTotal(() => console.log(C.pretty(c))),
      () => I.unit()
    )
  ),
  I.run()
)

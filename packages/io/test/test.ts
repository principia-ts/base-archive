import type * as E from '@principia/base/Either'

import '@principia/base/unsafe/Operators'

import * as Ev from '@principia/base/Eval'
import { none, some } from '@principia/base/Option'
import Bench from 'benchmark'

import * as I from '../src/IO'
import * as Ref from '../src/IORef'
import * as M from '../src/Managed'
import * as P from '../src/Promise'
import * as Sc from '../src/Schedule'
import * as S from '../src/Stream'

;

(async () => {
  const iter = await S.iterate(0, (n) => n + 1)
    ['|>'](S.take(100))
    ['|>'](S.concat(S.fail('Error')))
    ['|>'](S.toAsyncIterable)
    ['|>'](M.use(I.succeed))
    ['|>'](I.runPromise)

  for await (const n of iter) {
    console.log(n)
  }
})()

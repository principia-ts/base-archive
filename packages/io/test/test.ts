import '@principia/compile/enableTracing'

import { pipe } from '@principia/base/Function'
import { inspect } from 'util'

import * as Ca from '../src/Cause'
import * as Ex from '../src/Exit'
import * as T from '../src/IO'

pipe(
  T.succeed(1),
  T.bind((n) => {
    return T.succeed(n + 1)
  }),
  T.bind((n) => {
    return T.succeed(n + 1)
  }),
  T.bind((n) => {
    return T.succeed(n + 1)
  }),
  T.tap((n) => {
    return T.fail(`(${n})`)
  }),
  T.catchAll(function handle(n) {
    return T.succeed(n)
  }),
  T.bind((n) => {
    return T.fail(`error: ${n}`)
  }),
  T.bind(() => T.succeed(0)),
  T.run((ex) => console.log(Ca.pretty((ex as any).cause)))
)

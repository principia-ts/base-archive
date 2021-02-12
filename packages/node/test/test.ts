import '@principia/base/unsafe/Operators'

import { pipe } from '@principia/base/Function'
import * as I from '@principia/io/IO'

import { runMain } from '../src/Runtime'

pipe(
  I.succeed(1),
  I.bind((n) => I.succeed(n + 1)),
  I.bind((n) => I.succeed(n + 2)),
  I.bind((n) => I.fail(new Error(`${n}`))),
  runMain
)

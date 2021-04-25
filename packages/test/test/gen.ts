import * as C from '@principia/base/Chunk'
import * as I from '@principia/base/IO'
import * as S from '@principia/base/Stream'
import { pipe } from '@principia/prelude/function'

import * as Gen from '../src/Gen'
import * as Sa from '../src/Sample'

pipe(
  Gen.anyBigInt.sample,
  S.map((sample) => sample.value),
  S.forever,
  S.take(100),
  S.runCollect,
  I.bind((chunk) => I.effectTotal(() => console.log(C.toArray(chunk)))),
  I.run()
)

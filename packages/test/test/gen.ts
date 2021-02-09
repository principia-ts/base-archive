import '@principia/base/unsafe/Operators'

import { pipe } from '@principia/base/Function'
import { none, some } from '@principia/base/Option'
import * as I from '@principia/io/IO'
import { nextDouble, nextIntBetween } from '@principia/io/Random'
import * as S from '@principia/io/Stream'

import * as Gen from '../src/Gen'
import * as Sa from '../src/Sample'

const x = Gen.weighted([Gen.constant(true), 9], [Gen.constant(false), 1])

pipe(
  Gen.arrayOfN_(Gen.int(0, 100), 10).sample,
  S.map((sample) => sample.value),
  S.forever,
  S.take(100),
  S.runCollect,
  I.bind((chunk) => I.effectTotal(() => console.log(chunk))),
  I.run
)

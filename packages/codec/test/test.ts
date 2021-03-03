import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'
import { inspect } from 'util'

import { paths } from '../src/DecodeErrors'
import * as D from '../src/DecoderKF'
import { decode } from '../src/EitherDecoder'

const sum = D.sum('_tag')

const A = D.struct({ _tag: D.literal('A')(), a: D.string() })
const B = D.struct({ _tag: D.literal('B')(), b: D.number() })

const decoder = sum({ A, B })

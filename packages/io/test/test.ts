import '@principia/compile/enableTracing'

import * as E from '@principia/base/Either'
import { getEitherT } from '@principia/base/EitherT'
import { pipe } from '@principia/base/Function'
import * as HKT from '@principia/base/HKT'
import { inspect } from 'util'

import * as I from '../src/IO'

const M = getEitherT(I.Monad)
